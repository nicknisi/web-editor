import global from '@dojo/core/global';
import { createHandle } from '@dojo/core/lang';
import { queueTask } from '@dojo/core/queue';
import { debounce } from '@dojo/core/util';
import { v, w } from '@dojo/widget-core/d';
import { Constructor, VirtualDomProperties, WidgetProperties } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import DomWrapper from '@dojo/widget-core/util/DomWrapper';
import project from './project';
import * as css from './styles/editor.m.css';

const globalMonaco: typeof monaco = global.monaco;

/**
 * @type EditorProperties
 *
 * Properties that can be set on an `Editor` widget
 *
 * @property filename The filename (from the current `project`) that the editor should be displaying for editing
 * @property options Editor options that should be passed to the monaco editor when it is created
 * @property onEditorInit Called when the monaco editor is created and initialized by the widget, passing the instance of the monaco editor
 * @property onEditorLayout Called when the widget calls `.layout()` on the monaco editor
 */
export interface EditorProperties extends WidgetProperties, ThemeableProperties {
	filename?: string;
	options?: monaco.editor.IEditorOptions;

	onEditorInit?(editor: monaco.editor.IStandaloneCodeEditor): void;
	onEditorLayout?(): void;
}

export interface TextEditorOptions extends monaco.editor.IEditorOptions {

	/**
	 * Text editor selection.
	 */
	selection?: {
		startLineNumber: number;
		startColumn: number;
		endLineNumber?: number;
		endColumn?: number;
	};
}

export interface ResourceInput {

	/**
	 * The resource URL of the resource to open.
	 */
	resource: monaco.Uri;

	/**
	 * The encoding of the text input if known.
	 */
	encoding?: string;

	/**
	 * Optional options to use when opening the text input.
	 */
	options?: TextEditorOptions;
}

export interface TextEditorModel extends monaco.editor.IEditorModel {
	textEditorModel: any;
}

export class EditorService {
	_serviceBrand: any;
	openEditor(input: ResourceInput, sideBySide?: boolean): Promise<monaco.editor.IEditor> {
		console.log('openEditor', input);
		return Promise.resolve({});
	}
	resolveEditor(input: ResourceInput, refresh?: boolean): Promise<TextEditorModel> {
		console.log('resolveEditor', input);
		return Promise.resolve({});
	}
}

const ThemeableBase = ThemeableMixin(WidgetBase);

@theme(css)
export default class Editor extends ThemeableBase<EditorProperties> {
	private _editor: monaco.editor.IStandaloneCodeEditor | undefined;
	private _editorService: EditorService;
	private _EditorDom: Constructor<WidgetBase<VirtualDomProperties & WidgetProperties>>;
	private _didChangeHandle: monaco.IDisposable;
	private _onAfterRender = async () => {
		if (!this._editor) {
			const {
				_onDidChangeModelContent,
				_root,
				properties: {
					onEditorInit,
					options
				}
			} = this;
			const editorService = this._editorService = new EditorService();
			const editor = this._editor = globalMonaco.editor.create(_root, options, { editorService });
			const didChangeHandle = this._didChangeHandle = editor.onDidChangeModelContent(debounce(_onDidChangeModelContent, 1000));
			this._setModel();
			onEditorInit && onEditorInit(editor);

			this.own(createHandle(() => {
				if (editor) {
					editor.dispose();
					didChangeHandle.dispose();
				}
			}));
		}
		this._editor.layout();
		this._queuedLayout = false;
		const { onEditorLayout } = this.properties;
		onEditorLayout && onEditorLayout();
	}
	private _onDidChangeModelContent = () => {
		if (this.properties.filename) {
			project.setFileDirty(this.properties.filename);
		}
	}
	private _queuedLayout = false;
	private _root: HTMLDivElement;

	private _setModel() {
		const { filename } = this.properties;
		if (this._editor && filename && project.includes(filename)) {
			this._editor.setModel(project.getFileModel(filename));
		}
	}

	constructor() {
		super();
		const root = this._root = document.createElement('div');
		root.style.height = '100%';
		root.style.width = '100%';
		this._EditorDom = DomWrapper(root);
	}

	public render() {
		/* TODO: Refactor when https://github.com/dojo/widget-core/pull/548 published */
		if (!this._queuedLayout) {
			/* doing this async, during the next major task, to allow the widget to actually render */
			this._queuedLayout = true;
			queueTask(this._onAfterRender);
		}
		this._setModel();
		/* TODO: Create single node when https://github.com/dojo/widget-core/issues/553 resolved */
		return v('div', {
			classes: this.classes(css.root)
		}, [ this.properties.filename ? w(this._EditorDom, { key: 'editor' }) : null ]);
	}
}
