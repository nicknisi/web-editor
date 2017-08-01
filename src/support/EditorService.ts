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

export interface TextEditorModel extends monaco.editor.IModel {
	textEditorModel: any;
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

export default class EditorService {
	_serviceBrand: any;

	editor: monaco.editor.IStandaloneCodeEditor;

	async openEditor(input: ResourceInput, sideBySide?: boolean): Promise<monaco.editor.IEditor> {
		console.log('openEditor', input);
		return this.editor;
	}

	async resolveEditor(input: ResourceInput, refresh?: boolean): Promise<TextEditorModel> {
		console.log('resolveEditor', input);
		return this.editor.getModel() as TextEditorModel;
	}
}
