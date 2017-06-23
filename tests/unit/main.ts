import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import loadModule from '../support/loadModule';

import { enable, register } from '../support/mock';

let handle: any;
let main: any;

/* tslint:disable:variable-name */
let Editor: any;
let FileBar: any;
let IconCss: any;
let project: any;
let Runner: any;
let routing: any;
let TreePane: any;

registerSuite({
	name: 'main',

	async setup() {
		Editor = {};
		FileBar = {};
		IconCss = {};
		project = {};
		routing = {};
		Runner = {};
		TreePane = {};

		register('src/Editor', {
			default: Editor
		});
		register('src/FileBar', {
			default: FileBar
		});
		register('src/IconCss', {
			default: IconCss
		});
		register('src/project', {
			default: project
		});
		register('src/routing', routing);
		register('src/Runner', {
			default: Runner
		});
		register('src/TreePane', {
			default: TreePane
		});
		handle = enable();

		main = await loadModule('../../src/main', require);
	},

	teardown() {
		handle.destroy();
	},

	async 'validate API'() {
		assert.strictEqual(main.Editor, Editor);
		assert.strictEqual(main.FileBar, FileBar);
		assert.strictEqual(main.IconCss, IconCss);
		assert.strictEqual(main.project, project);
		assert.strictEqual(main.routing, routing);
		assert.strictEqual(main.Runner, Runner);
		assert.strictEqual(main.TreePane, TreePane);
		assert.lengthOf(Object.keys(main), 7, 'should have only 7 exports');
	}
});
