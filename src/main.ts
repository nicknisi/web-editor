import { assign } from '@dojo/core/lang';
import { Request } from '@dojo/routing/interfaces';
import { find, includes } from '@dojo/shim/array';
import { v, w } from '@dojo/widget-core/d';
import Projector from '@dojo/widget-core/mixins/Projector';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import Editor from './Editor';
import FileBar, { FileItem } from './FileBar';
import IconCss from './IconCss';
import TreePane, { TreePaneItem } from './TreePane';
import * as css from './styles/treepane.m.css';
import project, { Program } from './project';
import { GistParameters, startGistRouter, setPath } from './routing';
import Runner, { RunnerProperties } from './Runner';
import { IconJson, load as loadIcons } from './support/icons';
import { getById, getByUsername } from './support/gists';
import { load as loadTheme } from './support/themes';
import darkTheme from './themes/dark/theme';

/* path to the project directory */
const PROJECT_DIRECTORY = '../projects/';
let icons: IconJson;
const sourcePath = '../extensions/vscode-material-icon-theme/out/src/material-icons.json';

function addFile(root: TreePaneItem | undefined, filename: string): TreePaneItem {
	if (!root) {
		root = {
			children: [],
			id: '',
			label: '',
			title: ''
		};
	}
	const endsWithPathMarker = /[\/\\]$/.test(filename);
	const parts = filename.split(/[\/\\]/);
	const deliminator = filename.split('/').length === parts.length ? '/' : '\\';
	const idParts: string[] = [];
	if (parts[0] === '.') {
		idParts.push(parts.shift()!);
		if (root.id === '') {
			root = {
				children: [],
				id: '.',
				label: '.',
				title: '.'
			};
		}
	}
	let parent = root;
	while (parts.length) {
		const currentPart = parts[0];
		if (!parent.children) {
			parent.children = [];
		}
		let item = find(parent.children, (child) => child.label === currentPart);
		if (!item) {
			item = {
				id: idParts.concat(currentPart).join(deliminator),
				label: currentPart,
				title: idParts.concat(currentPart).join(deliminator)
			};
			parent.children.push(item);
		}
		parent = item;
		idParts.push(parts.shift()!);
	}
	if (endsWithPathMarker && !parent.children) {
		parent.children = [];
	}
	return root;
}

interface GistReference {
	description: string;
	projectJson: string;
	id?: string;
}

/**
 * An example application widget that incorporates both the Editor and Runner widgets into a simplistic UI
 */
class App extends WidgetBase {
	private _activeFileIndex = 0;
	private _compiling = false;
	private _editorFilename = '';
	private _expanded = [ '/', '/src' ];
	private _gist: GistReference | undefined;
	private _gists: GistReference[] = [];
	private _githubUsername: string;
	private _loadingGists = false;
	private _program: Program | undefined;
	private _projectName = 'Dojo 2 Todo MVC';
	private _projectValue = 'dojo2-todo-mvc.project.json';
	private _onRouteGist = async (request: Request<any, GistParameters>) => {
		const isProjectLoaded = project.isLoaded();
		if (isProjectLoaded) {
			console.error('Project already loaded, cannot navigate to gist');
		}
		else {
			this._gist = await getById(request.params.id);
			if (this._gist) {
				try {
					await project.load(this._gist.projectJson);
					console.log('Project loaded');
					this.invalidate();
				}
				catch (err) {
					console.error(err);
				}
			}
			else {
				console.error(`Could not find gist with ID "${request.params.id}" `);
			}
		}
	}
	private _onRouteRoot = (request: Request<any, any>) => { };
	private _openFiles: string[] = [];
	private _selected: string;
	private _selectedGist: GistReference | undefined;

	private _getTreeItems(): TreePaneItem {
		const files = project.getFileNames();
		return files
			.sort((a, b) => a < b ? -1 : 1)
			.reduce((previous, current) => addFile(previous, current), {
				id: '',
				label: '',
				title: ''
			} as TreePaneItem);
	}

	private _getActiveFile(): number {
		return this._activeFileIndex;
	}

	private _getFileItems(): FileItem[] {
		return this._openFiles.map((filename) => {
			return {
				closeable: true,
				key: filename,
				label: filename.split(/[\/\\]/).pop()!
			};
		});
	}

	private _onchangeGists(e: Event) {
		const select: HTMLInputElement = e.target as any;
		this._selectedGist = find(this._gists, ({ projectJson }) => projectJson === select.value);
	}

	private _onchangeGithubUsername(e: Event) {
		const select: HTMLInputElement = e.target as any;
		this._githubUsername = select.value;
	}

	/**
	 * Handle when the project name changes in the dropdown
	 * @param e The DOM `onchange` event
	 */
	private _onchangeProject(e: Event) {
		e.preventDefault();
		const select: HTMLSelectElement = e.target as any;
		this._projectValue = select.value;
		this._projectName = select.options[select.selectedIndex].text || '?';
	}

	/**
	 * Handle when the on project load button is clicked
	 * @param e The DOM `onclick` event
	 */
	private _onclickLoad(e: MouseEvent) {
		e.preventDefault();
		console.log(`Loading project "${this._projectValue}"...`);
		(async () => {
			try {
				await project.load(PROJECT_DIRECTORY + this._projectValue);
				console.log('Project loaded');
				this.invalidate();
			}
			catch (err) {
				console.error(err);
			}
		})();
	}

	private _onclickLoadGist(e: MouseEvent) {
		e.preventDefault();
		if (this._selectedGist) {
			setPath(this._selectedGist.id);
		}
	}

	private _onclickLoadGists(e: MouseEvent) {
		e.preventDefault();
		if (!this._githubUsername) {
			return;
		}
		console.log(`Loading gists for: "${this._githubUsername}"...`);
		this._loadingGists = true;
		this.invalidate();
		(async () => {
			try {
				const gists = await getByUsername(this._githubUsername);
				this._gists = [ ...(gists || []) ];
				if (this._gists.length) {
					this._selectedGist = this._gists[0];
				}
				console.log('Loaded.');
				this._loadingGists = false;
				this.invalidate();
			}
			catch (err) {
				console.error(err);
			}
		})();
	}

	/**
	 * Handle when the on project run button is clicked
	 * @param e The DOM `onclick` event
	 */
	private _onclickRun(e: MouseEvent) {
		e.preventDefault();
		console.log('Compiling project...');
		this._compiling = true;
		this.invalidate(); /* this will update the UI so "Run" is disabled */
		project.getProgram()
			.then((program) => {
				this._program = program;
				this.invalidate(); /* this will cause the properties to the runner to change, starting the run process */
			}, (err) => {
				console.error(err);
			});
	}

	private _onItemOpen(id: string) {
		this._selected = id;
		if (project.isLoaded() && project.includes(id)) {
			if (includes(this._openFiles, id)) {
				this._activeFileIndex = this._openFiles.indexOf(id);
			}
			else {
				this._activeFileIndex = this._openFiles.push(id) - 1;
			}
			this._editorFilename = id;
		}
		this.invalidate();
	}

	private _onItemSelect(id: string) {
		this._selected = id;
		this.invalidate();
	}

	private _onItemToggle(id: string) {
		if (includes(this._expanded, id)) {
			this._expanded.splice(this._expanded.indexOf(id), 1);
		}
		else {
			this._expanded.push(id);
		}
		this.invalidate();
	}

	private _onRequestTabClose(file: FileItem, index: number) {
		this._openFiles.splice(index, 1);
		this._activeFileIndex = this._activeFileIndex >= this._openFiles.length ?
			this._openFiles.length - 1 : this._activeFileIndex === index ?
				index : this._activeFileIndex ?
					this._activeFileIndex - 1 : 0;
		this._editorFilename = this._openFiles[this._activeFileIndex];
		this.invalidate();
	}

	private _onRequestTabChange(file: FileItem, index: number) {
		this._selected = this._editorFilename = this._openFiles[this._activeFileIndex = index];
		this.invalidate();
	}

	constructor() {
		super();
		this.own(startGistRouter({
			onGist: this._onRouteGist,
			onRoot: this._onRouteRoot
		}));
	}

	/**
	 * Handles when the Runner widget finishes running the project
	 */
	private _onRun() {
		this._compiling = false;
		this.invalidate(); /* this will enable the "Run" button in the UI */
	}

	render() {
		const isProjectLoaded = project.isLoaded();

		const programName = isProjectLoaded ? v('h3', { }, [ this._projectName || '' ]) : null;

		const gistLoad = !isProjectLoaded ? v('div', { key: 'gistLoad' }, [
			v('label', { for: 'username' }, [ 'GitHub username: ' ]),
			v('input', { name: 'username', type: 'text', placeholder: 'GitHub username', onchange: this._onchangeGithubUsername }),
			v('button', { type: 'button', name: 'load-gists', id: 'load-gists', onclick: this._onclickLoadGists, disabled: this._loadingGists ? true : false }, [ 'Get Gists' ])
		]) : null;

		const gists = this._gists.length && !isProjectLoaded ? v('div', {}, [
			v('label', { for: 'gists' }, [ 'Gist to load: ' ]),
			v('select', { type: 'text', name: 'gists', id: 'gists', onchange: this._onchangeGists }, this._gists.map(({ description, projectJson }) => v('option', { value: projectJson }, [ description ]))),
			v('button', { type: 'button', name: 'load-gist', id: 'load-gist', onclick: this._onclickLoadGist }, [ 'Load' ])
		]) : null;

		/* A UI to select a project and provide a button to load it */
		const projectLoad = !isProjectLoaded ? v('div', { key: 'projectLoad' }, [
			v('label', { for: 'project' }, [ 'Project to load: ' ]),
			v('select', { type: 'text', name: 'project', id: 'project', onchange: this._onchangeProject }, [
				v('option', { value: 'dojo-test-app.project.json' }, [ 'Dojo 2 Hello World' ]),
				v('option', { value: 'dojo2-todo-mvc.project.json', selected: true }, [ 'Dojo 2 Todo MVC' ]),
				v('option', { value: 'dojo2-todo-mvc-tsx.project.json' }, [ 'Dojo 2 Todo MVC TSX' ]),
				v('option', { value: 'dojo2-todo-mvc-kitchensink.project.json' }, [ 'Dojo 2 Kitchensink Todo MVC' ])
			]),
			v('button', { type: 'button', name: 'load-project', id: 'load-project', onclick: this._onclickLoad }, [ 'Load' ])
		]) : null;

		/* A UI to run the loaded project */
		const projectRun = isProjectLoaded ? v('div', { key: 'projectRun' }, [
			v('button', { type: 'button', name: 'run', id: 'run', onclick: this._onclickRun, disabled: this._compiling ? true : false }, [ 'Run' ])
		]) : null;

		const runnerProperties: RunnerProperties = assign({}, this._program, { key: 'runner', onRun: this._onRun, theme: darkTheme });

		return v('div', {
			classes: {
				'app': true
			}
		}, [
			v('h1', { }, [ '@dojo/web-editor']),
			programName,
			v('div', {
				classes: {
					'app': true
				}
			}, [
				w(IconCss, {
					baseClass: css.labelFixed,
					icons,
					key: 'iconcss',
					sourcePath
				}),
				gistLoad,
				gists,
				projectLoad,
				projectRun,
				v('div', {
					classes: {
						wrap: true
					},
					key: 'wrap'
				}, [
					v('div', {
						styles: { flex: '1' }
					}, [ w(TreePane, {
						expanded: [ ...this._expanded ],
						icons,
						key: 'treepane',
						selected: this._selected,
						sourcePath,
						root: isProjectLoaded ? this._getTreeItems() : undefined,
						onItemOpen: this._onItemOpen,
						onItemSelect: this._onItemSelect,
						onItemToggle: this._onItemToggle,
						theme: darkTheme
					}) ]),
					v('div', {
						styles: { flex: '1', margin: '0 0.5em' }
					}, [
						this._openFiles.length ? w(FileBar, {
							activeIndex: this._getActiveFile(),
							files: this._getFileItems(),
							key: 'filebar',
							theme: darkTheme,
							onRequestTabClose: this._onRequestTabClose,
							onRequestTabChange: this._onRequestTabChange
						}) : null,
						w(Editor, {
							filename: this._editorFilename,
							key: 'editor',
							options: {
								minimap: { enabled: false }
							},
							theme: darkTheme
						})
					]),
					w(Runner, runnerProperties)
				])
			])
		]);
	}
}

/* Mixin a projector to the App and create an instance */
const projector = new (Projector(App))();

(async () => {
	await loadTheme('./themes/editor-dark.json');
	icons = await loadIcons(sourcePath);
	/* Start the projector and append it to the document.body */
	projector.append();
})();
