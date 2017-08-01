import { find } from '@dojo/shim/array';
import { TypeScriptWorker } from '../interfaces';

export default class DefinitionProvider implements monaco.languages.DefinitionProvider {
	private _worker: TypeScriptWorker;
	private _hasFile: (filename: string) => boolean;

	constructor(worker: TypeScriptWorker, hasFile: (filename: string) => boolean) {
		this._hasFile = hasFile;
		this._worker = worker;
	}

	public model?: monaco.editor.IModel;

	public async provideDefinition(model: monaco.editor.IReadOnlyModel, position: monaco.Position, token: monaco.CancellationToken): Promise<monaco.languages.Definition | void> {
		const resource = model.uri;
		const services = await this._worker(resource);
		const quickInfo = await services.getQuickInfoAtPosition(resource.toString(), monaco.editor.getModel(resource).getOffsetAt(position));
		if (quickInfo.kind === 'module') {
			const displayPart = find(quickInfo.displayParts, ({ kind }) => kind === 'moduleName');
			if (displayPart) {
				const filename = displayPart.text;
				if (this._hasFile(filename)) {
					return {
						uri: monaco.Uri.parse(filename),
						range: new monaco.Range(0, 0, 0, 0)
					};
				}
			}
		}
	}
}
