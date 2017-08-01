import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import global from '@dojo/core/global';
import { assign } from '@dojo/core/lang';
import { Handle } from '@dojo/interfaces/core';
import harness, { Harness } from '@dojo/test-extras/harness';
import { HNode, WNode, WidgetProperties, VirtualDomProperties } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import loadModule from '../support/loadModule';
import * as css from '../../src/styles/editor.m.css';
import UnitUnderTest, { EditorProperties } from '../../src/Editor';

import { sandbox as sinonSandbox, SinonSandbox, SinonSpy, SinonStub } from 'sinon';
import { enable, register } from '../support/mock';

/* tslint:disable:variable-name */
let Editor: typeof UnitUnderTest;
let widget: Harness<EditorProperties, typeof UnitUnderTest>;

let sandbox: SinonSandbox;
let mockHandle: Handle;
let monacoEditorCreateElement: HTMLElement;
let monacoEditorCreateOptions: any;
let setModelStub: SinonStub;
let onDidChangeModelContentStub: SinonStub;
let onDidChangeModelContentDisposeStub: SinonStub;
let disposeStub: SinonStub;
let layoutStub: SinonStub;
let setFileDirtyStub: SinonStub;

let projectFileMap: { [filename: string]: boolean; };

function getMonacoEditor(properties: Partial<EditorProperties> = {}): Promise<monaco.editor.IStandaloneCodeEditor> {
	return new Promise((resolve, reject) => {
		function onEditorInit(editor: monaco.editor.IStandaloneCodeEditor) {
			try {
				resolve(editor);
			}
			catch (e) {
				reject(e);
			}
		}

		widget.setProperties(assign(properties, { onEditorInit }));
		widget.callListener('onAttached', {
			key: 'editor'
		});
	}) as any;
}

registerSuite({
	name: 'Editor',

	async setup() {
		sandbox = sinonSandbox.create();
		setModelStub = sandbox.stub();
		onDidChangeModelContentDisposeStub = sandbox.stub();
		onDidChangeModelContentStub = sandbox.stub();
		disposeStub = sandbox.stub();
		layoutStub = sandbox.stub();
		setFileDirtyStub = sandbox.stub();

		register('src/project', {
			default: {
				includes: sandbox.spy((filename: string) => {
					return projectFileMap[filename];
				}),
				getFileModel: sandbox.spy((filename: string) => {
					return `model('${filename}')`;
				}),
				setFileDirty: setFileDirtyStub
			}
		});

		global.monaco = {
			editor: {
				create: sandbox.spy((element: HTMLElement, options?: any) => {
					monacoEditorCreateElement = element;
					monacoEditorCreateOptions = options;
					return {
						dispose: disposeStub,
						layout: layoutStub,
						onDidChangeModelContent: onDidChangeModelContentStub,
						setModel: setModelStub
					};
				})
			}
		};

		mockHandle = enable();

		Editor = (await loadModule('../../src/Editor', require)).default;
	},

	beforeEach() {
		widget = harness(Editor);
		onDidChangeModelContentStub.returns({
			dispose: onDidChangeModelContentDisposeStub
		});
		projectFileMap = {};
	},

	afterEach() {
		sandbox.reset();
	},

	teardown() {
		delete global.monaco;
		sandbox.restore();
		mockHandle.destroy();
	},

	'expected render, no filename'() {
		/* decomposing this as the DomWrapper constructor function is not exposed and therefore can't put it in the
		 * expected render */
		const render = widget.getRender() as HNode;
		assert.strictEqual(render.tag, 'div', 'should be a "div" tag');
		assert.deepEqual(render.properties.classes, widget.classes(css.root)(), 'should have proper classes');
		assert.lengthOf(render.children, 0, 'should have no children');
		assert.strictEqual(render.properties.key, 'editor', 'should have editor key set');
	},

	'expected render, with filename'() {
		/* decomposing this as the DomWrapper constructor function is not exposed and therefore can't put it in the
		 * expected render */
		widget.setProperties({
			filename: 'foo/bar.ts'
		});
		const render = widget.getRender() as WNode<WidgetBase<WidgetProperties & VirtualDomProperties>>;
		assert.deepEqual((render.properties.classes as any)(), widget.classes(css.root)(), 'should have proper classes');
		assert.lengthOf(render.children, 0, 'should have no children');
		assert.isFunction(render.widgetConstructor, 'should have a widget constructor');
		assert.strictEqual(render.properties.key, 'editor', 'should have editor key set');
	},

	async 'editor is initalized'() {
		const editor = await getMonacoEditor({ filename: 'foo/bar.ts' });
		const createSpy = monaco.editor.create as SinonSpy;
		assert(editor, 'editor should exist');
		assert.isTrue(createSpy.called, 'create should have been called');
		assert.instanceOf(monacoEditorCreateElement, global.window.HTMLDivElement);
	},

	async 'editor passes options'() {
		await getMonacoEditor({
			filename: './src/main.ts',
			options: { }
		});
		assert.deepEqual(monacoEditorCreateOptions, { }, 'should pass options properly');
	},

	async 'sets the proper file'() {
		projectFileMap['./src/main.ts'] = true;
		await getMonacoEditor({
			filename: './src/main.ts'
		});
		assert.isTrue(setModelStub.called, 'should have set the model on the editor');
		assert.strictEqual(setModelStub.lastCall.args[0], `model('./src/main.ts')`, 'should have set the proper model');
	},

	async 'setting to missing file is a no-op'() {
		await getMonacoEditor({
			filename: './src/main.ts'
		});
		assert.isFalse(setModelStub.called, 'should not have been called yet');
		widget.getRender();
		assert.isFalse(setModelStub.called, 'should not have been called');
	},

	async 'does layout on re-renders'() {
		let called = 0;
		function onEditorLayout() {
			called++;
		}
		await getMonacoEditor({
			filename: './src/foo.ts',
			onEditorLayout
		});
		const currentCallCount = called;
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					assert.strictEqual(called, currentCallCount + 1, 'should have called layout');
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}, 500);
		});
	},

	async '_onDidChangeModelContent'(this: any) {
		projectFileMap['./src/foo.ts'] = true;
		await getMonacoEditor({
			filename: './src/foo.ts'
		});
		widget.getRender();
		const _onDidChangeModelContent: () => void = onDidChangeModelContentStub.lastCall.args[0];
		assert.strictEqual(setFileDirtyStub.callCount, 0, 'should not have been called');
		[ 10, 20, 30, 40, 50, 100 ].forEach((interval) => {
			setTimeout(() => {
				_onDidChangeModelContent();
			}, interval);
		});
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				try {
					assert.strictEqual(setFileDirtyStub.callCount, 1, 'should have been called once, being debounced');
					assert.strictEqual(setFileDirtyStub.lastCall.args[0], './src/foo.ts', 'should have called with proper filename');
					resolve();
				}
				catch (e) {
					reject(e);
				}
			}, 1500);
		});
	}
});
