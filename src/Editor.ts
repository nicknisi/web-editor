import global from '@dojo/core/global';
import { createHandle } from '@dojo/core/lang';
import { queueTask } from '@dojo/core/queue';
import { debounce } from '@dojo/core/util';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import DomWrapper from '@dojo/widget-core/util/DomWrapper';
import project from './project';
import * as css from './styles/editor.m.css';

const globalMonaco: typeof monaco = global.monaco;

/**
 * Properties that can be set on an `Editor` widget
 */
export interface EditorProperties extends WidgetProperties, ThemeableProperties {
	/**
	 * The filename (from the current `project`) that the editor should be displaying for editing
	 */
	filename?: string;

	/**
	 * Editor options that should be passed to the monaco editor when it is created
	 */
	options?: monaco.editor.IEditorOptions;

	/**
	 * Called when the monaco editor is created and initialized by the widget, passing the instance of the monaco editor
	 */
	onEditorInit?(editor: monaco.editor.IStandaloneCodeEditor): void;

	/**
	 * Called when the widget calls `.layout()` on the monaco editor
	 */
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

/**
 * A Widget which will render a wrapped `monaco-editor`
 */
@theme(css)
export default class Editor extends ThemeableBase<EditorProperties> {
	private _editor: monaco.editor.IStandaloneCodeEditor | undefined;
	private _editorService: EditorService;
	private _EditorDom: DomWrapper;
	private _didChangeHandle: monaco.IDisposable;
	private _doLayout = async () => {
		this._queuedLayout = false;
		if (!this._editor) {
			return;
		}
		this._editor.layout();
		const { onEditorLayout } = this.properties;
		onEditorLayout && onEditorLayout();
	}
	private _onAttached = () => {
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
		this._EditorDom = DomWrapper(root, { onAttached: this._onAttached });
	}

	public render() {
		if (!this._queuedLayout) {
			/* doing this async, during the next major task, to allow the widget to actually render */
			this._queuedLayout = true;
			queueTask(this._doLayout);
		}
		this._setModel();
		return this.properties.filename ?
			/* DomWrapper ignores `onAttached` here, but is needed to make testing possible */
			w(this._EditorDom, { key: 'editor', classes: this.classes(css.root), onAttached: this._onAttached }) :
			v('div', { classes: this.classes(css.root), key: 'editor' });
	}
}
