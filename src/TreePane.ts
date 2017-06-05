import { includes } from '@dojo/shim/array';
import Map from '@dojo/shim/Map';
import { v, w } from '@dojo/widget-core/d';
import { WNode } from '@dojo/widget-core/interfaces';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { theme, ThemeableMixin, ThemeableProperties } from '@dojo/widget-core/mixins/Themeable';
import ScrollBar from './ScrollBar';
import * as css from './styles/treepane.m.css';
import { getAbsolutePosition } from './support/events';
import { IconJson, IconResolver } from './support/icons';

export interface TreePaneItem {
	children?: TreePaneItem[];
	class?: string;
	id: string;
	label: string;
	title: string;
}

export interface TreePaneProperties extends ThemeableProperties {
	expanded: string[];
	icons?: IconJson;
	label?: string;
	selected?: string;
	showRoot?: boolean;
	sourcePath?: string;
	root?: TreePaneItem;

	onItemOpen?(key?: string): void;
	onItemSelect?(key?: string): void;
	onItemToggle?(key?: string): void;
}

const ROW_HEIGHT = 22;
const ThemeableBase = ThemeableMixin(WidgetBase);

export interface RowProperties extends ThemeableProperties {
	class?: string;
	expanded?: boolean;
	hasChildren?: boolean;
	label: string;
	level: number;
	selected?: boolean;
	title?: string;

	onClick?(key?: string): void;
	onDblClick?(key?: string): void;
}

const ROW_LEVEL_LEFT_PADDING = 12;

@theme(css)
export class Row extends ThemeableBase<RowProperties> {
	private _onclick() {
		this.properties.onClick && this.properties.onClick(this.properties.key);
	}
	private _ondblclick() {
		this.properties.onDblClick && this.properties.onDblClick(this.properties.key);
	}

	render() {
		const classes = [ css.row, this.properties.selected && css.selected || null, this.properties.hasChildren && css.hasChildren || null, this.properties.expanded && css.expanded || null ];
		return v('div', {
			'aria-level': String(this.properties.level),
			'aria-selected': this.properties.selected,
			'aria-role': 'treeitem',
			classes: this.classes(...classes),
			role: 'treeitem',
			styles: {
				'padding-left': String(this.properties.level * ROW_LEVEL_LEFT_PADDING) + 'px'
			},
			onclick: this._onclick,
			ondblclick: this._ondblclick
		}, [
			v('div', {
				classes: this.classes().fixed(css.content)
			}, [
				v('div', {
					classes: this.classes().fixed(css.label, this.properties.class || null),
					title: this.properties.title
				}, [
					v('a', {
						classes: this.classes().fixed(css.labelName)
					}, [ this.properties.label ])
				])
			])
		]);
	}
}

@theme(css)
export default class TreePane extends ThemeableBase<TreePaneProperties> {
	private _dragging = false;
	private _dragPosition: number;
	private _items = new Map<string, TreePaneItem>();
	private _resolver: IconResolver;
	private _visibleRowCount: number;
	private _scrollPosition = 0;
	private _scrollVisible = false;
	private _size: number;
	private _sliderSize: number;

	private _cacheItems() {
		function cacheItem(cache: Map<string, TreePaneItem>, item: TreePaneItem) {
			cache.set(item.id, item);
			if (item.children) {
				item.children.forEach(child => cacheItem(cache, child));
			}
		}

		if (this.properties.root) {
			this._items.clear();
			cacheItem(this._items, this.properties.root);
		}
	}

	private _onDomUpdate(element: HTMLElement, key: string) {
		if (key === 'rows') {
			this._visibleRowCount = element.clientHeight / ROW_HEIGHT;
		}
	}

	private _onDragStart(evt: TouchEvent & MouseEvent) {
		evt.preventDefault();
		this._dragging = true;
		this._dragPosition = getAbsolutePosition(evt);
	}

	private _onDragMove(evt: TouchEvent & MouseEvent) {
		const {
			_dragging,
			_dragPosition
		} = this;
		if (_dragging) {
			evt.preventDefault();
			const delta = getAbsolutePosition(evt) - _dragPosition;
			this._onPositionUpdate(delta / ROW_HEIGHT);
			this._dragPosition = getAbsolutePosition(evt);
		}
	}

	private _onDragEnd(evt: TouchEvent & MouseEvent) {
		evt.preventDefault();
		this._dragging = false;
	}

	private _onmouseenter(evt: MouseEvent) {
		evt.preventDefault();
		this._scrollVisible = true;
		this.invalidate();
	}

	private _onmouseleave(evt: MouseEvent) {
		evt.preventDefault();
		this._scrollVisible = false;
		this.invalidate();
	}

	private _onPositionUpdate(delta: number): boolean {
		const { _scrollPosition, _size, _sliderSize } = this;
		const updatedPosition = _scrollPosition + delta;
		const maxPosition = _size - _sliderSize + 1;
		this._scrollPosition = updatedPosition > 0 ? updatedPosition > maxPosition ? maxPosition : updatedPosition : 0;
		if (_scrollPosition !== this._scrollPosition) {
			this.invalidate();
			return true;
		}
		return false;
	}

	private _onRowClick(key: string) {
		this.properties.selected !== key && this.properties.onItemSelect && this.properties.onItemSelect(key);
		const item = this._items.get(key);
		if (!item) {
			throw new Error(`Uncached TreePane row ID: "${key}"`);
		}
		if (item.children && this.properties.onItemToggle) {
			this.properties.onItemToggle(key);
		}
	}

	private _onRowDblClick(key: string) {
		this.properties.onItemOpen && this.properties.onItemOpen(key);
	}

	private _onScrollbarScroll = (delta: number) => {
		this._onPositionUpdate(delta);
	}

	private _onwheel(evt: WheelEvent) {
		if (this._onPositionUpdate(evt.deltaY / ROW_HEIGHT)) {
			evt.preventDefault();
		}
	}

	private _renderChild(item: TreePaneItem, level: number): WNode<Row> {
		const { children, id: key, label, title } = item;
		const expanded = includes(this.properties.expanded, key);
		const hasChildren = Boolean(children);
		return w(Row, {
			class: hasChildren ? this._resolver.folder(label, expanded) : this._resolver.file(label),
			expanded,
			hasChildren,
			key,
			level,
			label,
			selected: this.properties.selected === key,
			title,
			onClick: this._onRowClick,
			onDblClick: this._onRowDblClick
		});
	}

	private _renderChildren(): (WNode<Row> | null)[] {
		const {
			_scrollPosition,
			properties: {
				expanded,
				root,
				showRoot
			}
		} = this;
		const children: (WNode<Row> | null)[] = [];
		const start = _scrollPosition ? _scrollPosition - 1 : 0;
		const end = start + this._visibleRowCount + 2;
		let rowCount = 0;

		const addChildren = (items: TreePaneItem[], level: number) => {
			items.forEach((item) => {
				rowCount++;
				children.push(rowCount >= start && rowCount <= end ? this._renderChild(item, level) : null);
				if (item.children && item.children.length && includes(expanded, item.id)) {
					addChildren(item.children, level + 1);
				}
			});
		};

		if (root) {
			addChildren(showRoot ? [ root ] : root.children || [], 1);
		}

		return children;
	}

	public onElementCreated(element: HTMLElement, key: string) {
		this._onDomUpdate(element, key);
	}

	public onElementUpdated(element: HTMLElement, key: string) {
		this._onDomUpdate(element, key);
	}

	public render() {
		const {
			_onScrollbarScroll,
			_resolver,
			_scrollPosition,
			_scrollVisible,
			properties: {
				icons,
				key,
				label,
				sourcePath
			},
			_visibleRowCount
		} = this;
		if (!_resolver && icons && sourcePath) {
			this._resolver = new IconResolver(sourcePath, icons);
		}
		this._cacheItems();
		const top =  0 - (_scrollPosition % ROW_HEIGHT);
		const rows = this._renderChildren();
		const sliderSize = this._sliderSize = _visibleRowCount > rows.length ? rows.length : _visibleRowCount;
		const size = this._size = rows.length;
		return v('div', {
			'aria-label': label,
			classes: this.classes(css.root),
			key,
			role: 'tree',

			onmouseenter: this._onmouseenter,
			onmouseleave: this._onmouseleave
		}, [
			v('div', {
				classes: this.classes(css.scroll),
				key: 'rows',
				role: 'presentation',
				styles: {
					top: String(top) + 'px'
				},

				onmousedown: this._onDragStart,
				onmousemove: this._onDragMove,
				onmouseup: this._onDragEnd,
				ontouchstart: this._onDragStart,
				ontouchmove: this._onDragMove,
				ontouchend: this._onDragEnd,
				onwheel: this._onwheel
			}, rows),
			w(ScrollBar, {
				position: _scrollPosition,
				size,
				sliderSize,
				visible: _scrollVisible,

				onScroll: _onScrollbarScroll
			})
		]);
	}
}
