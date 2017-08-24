import { find, includes } from '@dojo/shim/array';
import { assign } from '@dojo/shim/object';
import { v, w } from '@dojo/widget-core/d';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import Editor from './Editor';
import IconCss from './IconCss';
import { Program } from './project';
import Runner, { RunnerProperties } from './Runner';
import TreePane, { TreePaneItem } from './TreePane';
import Toolbar, { TabItem } from './Toolbar';
import { IconJson } from './support/icons';
import * as treepaneCss from './styles/treepane.m.css';
import * as css from './styles/workbench.m.css';

const ThemeableBase = ThemeableMixin(WidgetBase);

export interface WorkbenchProperties extends ThemeableProperties {
	/**
	 * The filename that the editor should be displaying, otherwise `undefined`
	 */
	filename?: string;

	/**
	 * An array of filenames that the workbench should be displaying in the file tree, otherwise `undefined`
	 */
	files?: string[];

	/**
	 * An object which expresses the icons that should be used when displaying file icons
	 */
	icons?: IconJson;

	/**
	 * The source path to the icons
	 */
	iconsSourcePath?: string;

	/**
	 * The current emitted program that the runner should be running, otherwise `undefined`
	 */
	program?: Program;

	/**
	 * Called when a file is opened on the workbench
	 * @param filename The name of file that is being requested to be opened
	 */
	onFileOpen?(filename: string): void;

	/**
	 * Called when the runner completes loading the program
	 */
	onRun?(): void;
}

@theme(css)
export default class Workbench extends ThemeableBase<WorkbenchProperties> {
	private _expanded = [ '/', '/src' ];
	private _selected: string;
	private _activeFileIndex: number;

	/**
	 * The files currently open in the editor
	 */
	openFiles: string[] = [];

	private get _tabs(): TabItem[] {
		return this.openFiles.map(filename => {
			return {
				closeable: true,
				disabled: false,
				key: filename,
				label: filename.split(/[\/\\]/).pop()!
			};
		});
	}

	private _getTreeRoot(): TreePaneItem | undefined {
		/**
		 * Add a file to a tree of files, by parsing the filename and adding generating a `TreePaneItem`
		 * @param root The root to add the file to
		 * @param filename The full path of the filename
		 */
		function addFile(root: TreePaneItem, filename: string): TreePaneItem {
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

		const { files } = this.properties;
		if (files) {
			return files
				.sort((a, b) => a < b ? -1 : 1)
				.reduce((previous, current) => addFile(previous, current), {
					id: '',
					label: '',
					title: ''
				} as TreePaneItem);
		}
	}

	private _onItemOpen(id: string) {
		this._selected = id;
		const { onFileOpen, files = [] } = this.properties;

		if (includes(files, id)) {
			if (includes(this.openFiles, id)) {
				this._activeFileIndex = this.openFiles.indexOf(id);
			}
			else {
				this._activeFileIndex = this.openFiles.push(id) - 1;
			}
		}

		onFileOpen && onFileOpen(id);
		this.invalidate();
	}

	private _onItemClose(file: TabItem, index: number) {
		this.openFiles.splice(index, 1);
		this._activeFileIndex = this._activeFileIndex >= this.openFiles.length ?
			this.openFiles.length - 1 : this._activeFileIndex === index ?
			index : this._activeFileIndex ?
			this._activeFileIndex - 1 : 0;
		this.invalidate();
	}

	private _onItemChange(file: TabItem, index: number) {
		this._activeFileIndex = index;
		this.invalidate();
	}

	private _onItemSelect(id: string) {
		this._selected = id;
		this.invalidate();
	}

	private _onItemToggle(id: string) {
		const { _expanded } = this;
		if (includes(_expanded, id)) {
			_expanded.splice(_expanded.indexOf(id), 1);
		}
		else {
			_expanded.push(id);
		}
		this.invalidate();
	}

	render() {
		const {
			_expanded,
			_selected: selected,
			properties: {
				// filename,
				icons,
				iconsSourcePath: sourcePath,
				program,
				theme,
				onRun
			}
		} = this;

		const filename = this.openFiles[this._activeFileIndex];

		const runnerProperties: RunnerProperties = assign({}, program, { key: 'runner', theme, onRun });

		return v('div', {
			classes: this.classes(css.root)
		}, [
			w(IconCss, {
				baseClass: treepaneCss.labelFixed,
				icons,
				key: 'icons',
				sourcePath
			}),
			v('div', {
			}, [
				w(Toolbar, {
					activeIndex: this._activeFileIndex,
					tabs: this._tabs,
					sourcePath,
					icons,
					onRequestTabClose: this._onItemClose,
					onRequestTabChange: this._onItemChange
				})
			]),
			v('div', {
				classes: this.classes(css.filetree)
			}, [
				w(TreePane, {
					expanded: [ ..._expanded ],
					icons,
					key: 'treepane',
					root: this._getTreeRoot(),
					selected,
					sourcePath,
					theme,

					onItemOpen: this._onItemOpen,
					onItemSelect: this._onItemSelect,
					onItemToggle: this._onItemToggle
				})
			]),
			w(Editor, {
				filename,
				key: 'editor',
				options: {
					minimap: { enabled: false }
				},
				theme
			}),
			w(Runner, runnerProperties)
		]);
	}
}
