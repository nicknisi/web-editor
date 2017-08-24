import WidgetBase from '@dojo/widget-core/WidgetBase';
import { WidgetProperties, WNode } from '@dojo/widget-core/interfaces';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import TabController, { Align } from '@dojo/widgets/tabcontroller/TabController';
import Button from '@dojo/widgets/button/Button';
import Tab from '@dojo/widgets/tabcontroller/Tab';
import { v, w } from '@dojo/widget-core/d';
import * as css from './styles/toolbar.m.css';
import { IconResolver, IconJson } from './support/icons';

export interface TabItem {
	closeable?: boolean;
	disabled?: boolean;
	key: string;
	label: string;
}

export interface ToolbarProperties extends WidgetProperties, ThemeableProperties {
	activeIndex: number;
	tabs: TabItem[];
	onRequestTabClose?(file: TabItem, index: number): void;
	onRequestTabChange?(file: TabItem, index: number): void;
	icons?: IconJson;
	sourcePath?: string;
}

const ToolbarBase = ThemeableMixin(WidgetBase);

@theme(css)
class Toolbar extends ToolbarBase<ToolbarProperties> {
	private _resolver: IconResolver;

	constructor() {
		super();
	}

	private _toggleDrawer() {
		console.log('_toggleDrawer');
	}

	private _togglePreview() {
		console.log('_togglePreview');
	}

	private _onRequestTabClose = (index: number) => {
		const { onRequestTabClose } = this.properties;
		const tab = this.properties.tabs[index];
		onRequestTabClose && onRequestTabClose(tab, index);
	}

	private _onRequestTabChange = (index: number) => {
		console.log('TAB CHANGE');
		const { onRequestTabChange } = this.properties;
		const tab = this.properties.tabs[index];
		onRequestTabChange && onRequestTabChange(tab, index);
	}

	protected closeIndex(index: number) {
		const { onRequestTabClose } = this.properties;
		const tab = this.properties.tabs[index];

		onRequestTabClose && onRequestTabClose(tab, index);
	}

	protected _renderTab = (tab: TabItem): WNode<Tab> => {
		const { _resolver: resolver } = this;
		const { label: filename, key, closeable, disabled } = tab;
		console.log('filename', filename);
		const label = v('span', {
			'class': resolver.file(filename)
		}, [ filename ]);
		return w(Tab, {
			label,
			key,
			closeable,
			disabled
		});
	}

	render() {
		const {
			_resolver: resolver,
			properties: {
				icons,
				sourcePath,
				tabs
			}
		} = this;
		if (!resolver && icons && sourcePath) {
			console.log('setting resolver');
			this._resolver = new IconResolver(sourcePath, icons);
		}
		return v('div.toolbar', {
			classes: this.classes(css.root)
		}, [
			w(Button, {
				onClick: this._toggleDrawer
			}, [ 'Toggle Drawer' ]),
			w(TabController, {
				activeIndex: 0,
				alignButtons: Align.top,
				onRequestTabClose: this._onRequestTabClose,
				onRequestTabChange: this._onRequestTabChange
			}, tabs.map(this._renderTab)),
			w(Button, {
				onClick: this._togglePreview
			}, [ 'Toggle Preview' ])
		]);
	}
}

export default Toolbar;
