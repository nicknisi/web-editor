import global from '@dojo/shim/global';

// function withPromise(promiseName: keyof MonacoLoader) {
// 	return function (target: Object, methodName: string, descriptor: PropertyDescriptor) {
// 		const fn = descriptor.value;
// 		descriptor.value = function (this: MonacoLoader, ...args: any[]) {
// 			if (this[promiseName]) {
// 				return this[promiseName];
// 			}
// 			this[promiseName] = fn.apply(this, args);
// 		};
// 	};
// }

// export class MonacoLoader {
// 	monacoPromise: Promise<void>;
// 	loaderPromise: Promise<void>;
// 	loaderUrl = 'vs/loader.js';
// 	monacoMid = 'vs/editor/editor.main';

// 	constructor() {
// 		this.loadLoader();
// 	}

// 	private _injectScript(src: string): Promise<void> {
// 		let onLoad: () => void;
// 		let onError: () => void;
// 		let script: HTMLScriptElement;

// 		const cleanup = () => {
// 			script.removeEventListener('load', onLoad);
// 			script.removeEventListener('error', onError);
// 		};

// 		const promise = new Promise<void>((resolve, reject) => {
// 			onLoad = () => resolve();
// 			onError = () => reject();
// 			script = document.createElement('script');
// 			script.type = 'text/javascript';
// 			script.src = src;
// 			script.addEventListener('load', onLoad);
// 			script.addEventListener('error', onError);
// 			document.head.appendChild(script);
// 		});

// 		promise.then(cleanup, cleanup);

// 		return promise;
// 	}

// 	@withPromise('loaderPromise')
// 	loadLoader(src: string = this.loaderUrl): Promise<void> {
// 		return this._injectScript(src);
// 	}

// 	@withPromise('monacoPromise')
// 	loadMonaco(mid: string = this.monacoMid): Promise<void> {
// 		return new Promise<void>(async (resolve, reject) => {
// 			try {
// 				await this.loadLoader();
// 				global.require([mid], () => {
// 					resolve();
// 				});
// 			} catch (e) {
// 				reject();
// 			}
// 		});
// 	}
// }

function injectScript(url: string): Promise<void> {
	let onLoad: () => void;
	let onError: () => void;
	let script: HTMLScriptElement;

	const cleanup = () => {
		script.removeEventListener('load', onLoad);
		script.removeEventListener('error', onError);
	};

	const promise = new Promise<void>((resolve, reject) => {
		onLoad = () => resolve();
		onError = () => reject();
		script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = url;
		script.addEventListener('load', onLoad);
		script.addEventListener('error', onError);
		document.head.appendChild(script);
	});

	promise.then(cleanup, cleanup);

	return promise;
}

let monacoPromise: Promise<void>;

export function loadMonaco(): Promise<void> {
	if (monacoPromise) {
		return monacoPromise;
	}

	monacoPromise = new Promise<void>(async (resolve, reject) => {
		try {
			await injectScript('vs/loader.js');
			global.require(['vs/editor/editor.main'], async () => {
				resolve();
			});
		} catch (e) {
			reject();
		}
	});

	return monacoPromise;
}

export default loadMonaco;
