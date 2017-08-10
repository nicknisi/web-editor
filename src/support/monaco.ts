import global from '@dojo/shim/global';

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
