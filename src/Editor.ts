import { createHandle } from '@dojo/core/lang';
import { queueTask } from '@dojo/core/queue';
import { debounce } from '@dojo/core/util';
import global from '@dojo/shim/global';
import { v, w } from '@dojo/widget-core/d';
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import DomWrapper from '@dojo/widget-core/util/DomWrapper';
import project from './project';
import EditorService from './support/EditorService';
import * as css from './styles/editor.m.css';

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
	private _onAttached = async () => {
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
			const editor = this._editor = global.monaco.editor.create(_root, options, { editorService });
			editorService.editor = editor;
			const didChangeHandle = this._didChangeHandle = editor.onDidChangeModelContent(debounce(_onDidChangeModelContent, 1000));
			this._setModel();

			this.own(createHandle(() => {
				if (editor) {
					editor.dispose();
					didChangeHandle.dispose();
				}
			}));

			onEditorInit && onEditorInit(editor);
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
