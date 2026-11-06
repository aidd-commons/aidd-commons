import { opennessDimensions, type Resource } from "../data/resource.js";
import type {
  AtlasQuery,
  AtlasState,
  AtlasView,
  AtlasSort,
} from "./atlas-state.js";
import {
  evidenceForIds,
  evidenceForSupport,
  filterResources,
  parseAtlasState,
  paginateAtlasResources,
  serializeAtlasQuery,
  serializeAtlasState,
  sortAtlasResources,
  toggleAtlasComparison,
} from "./atlas-state.js";
import {
  activeAtlasFilters,
  assetStateLabels,
  localizedAtlasLabel,
  atlasLandscape,
  comparisonAssetRows,
  emptyAtlasQuery,
  emptyAtlasState,
} from "./atlas-presentation.js";
import type { AtlasSearchEntry } from "./atlas-presentation.js";
import { localizedPath } from "./site-locale.js";
import { withSiteBase } from "./site-paths.js";

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text = "",
  className = "",
) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

export class ResourceExplorer extends HTMLElement {
  private form?: HTMLFormElement;
  private resources: AtlasSearchEntry[] = [];
  private state: AtlasState = { ...emptyAtlasState, compare: [] };
  private events?: AbortController;
  private resultsKey = "";
  private comparisonKey = "";
  private comparisonVersion = 0;
  private overviewKey = "";
  private details = new Map<string, Resource>();
  private searchTimer?: ReturnType<typeof setTimeout>;

  connectedCallback() {
    this.form =
      this.querySelector<HTMLFormElement>("[data-atlas-controls]") ?? undefined;
    if (!this.form) return;
    this.events = new AbortController();
    const { signal } = this.events;
    this.form.addEventListener(
      "input",
      (event) => {
        if (!(event.target instanceof HTMLInputElement)) return;
        clearTimeout(this.searchTimer);
        this.searchTimer = setTimeout(() => this.applyFormQuery(), 180);
      },
      { signal },
    );
    this.form.addEventListener("change", () => this.applyFormQuery(), {
      signal,
    });
    this.form.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();
        this.applyFormQuery();
      },
      { signal },
    );
    this.form.addEventListener(
      "reset",
      (event) => {
        event.preventDefault();
        this.setState({ ...this.state, ...emptyAtlasQuery });
      },
      { signal },
    );
    this.addEventListener(
      "change",
      (event) => {
        if (
          event.target instanceof HTMLInputElement &&
          event.target.dataset.compareId
        ) {
          this.setState({
            ...this.state,
            compare: toggleAtlasComparison(
              this.state.compare,
              event.target.dataset.compareId,
            ),
          });
        }
        if (
          event.target instanceof HTMLSelectElement &&
          event.target.matches("[data-atlas-sort]")
        ) {
          this.setState({
            ...this.state,
            sort: event.target.value as AtlasSort,
          });
        }
        if (
          event.target instanceof HTMLSelectElement &&
          event.target.matches("[data-atlas-page-select]")
        ) {
          this.changePage(Number(event.target.value));
        }
      },
      { signal },
    );
    this.addEventListener(
      "click",
      (event) => {
        const button =
          event.target instanceof Element
            ? event.target.closest<HTMLButtonElement>("button")
            : null;
        if (!button) return;
        if (button.dataset.pageDirection) {
          this.changePage(
            this.state.page + Number(button.dataset.pageDirection),
          );
        } else if (button.dataset.removeFilter) {
          const key = button.dataset.removeFilter as keyof AtlasQuery;
          this.setState({ ...this.state, [key]: "" });
          const field = this.form?.elements.namedItem(key);
          if (field instanceof HTMLElement) field.focus();
        } else if (button.dataset.atlasView) {
          this.setState({
            ...this.state,
            view: button.dataset.atlasView as AtlasView,
          });
        } else if (button.dataset.removeComparison) {
          this.setState({
            ...this.state,
            compare: this.state.compare.filter(
              (id) => id !== button.dataset.removeComparison,
            ),
          });
        } else if (button.hasAttribute("data-compare-clear")) {
          this.setState({ ...this.state, compare: [] });
        } else if (button.hasAttribute("data-landscape-stage")) {
          this.setState({
            ...this.state,
            stage: button.dataset.landscapeStage!,
            kind: button.dataset.landscapeKind!,
            view: "list",
          });
        } else if (button.hasAttribute("data-scope-stage")) {
          this.setState({
            ...this.state,
            stage: button.dataset.scopeStage!,
            kind: button.dataset.scopeKind!,
            view: "list",
          });
          this.node(".atlas-result-bar").scrollIntoView({ block: "start" });
        } else if (button.hasAttribute("data-retry-index")) {
          void this.loadIndex();
        } else if (button.hasAttribute("data-retry-comparison")) {
          this.comparisonKey = "";
          void this.renderComparison();
        } else if (button.hasAttribute("data-atlas-export")) {
          this.exportResults();
        }
      },
      { signal },
    );
    window.addEventListener(
      "popstate",
      () => {
        clearTimeout(this.searchTimer);
        this.state = parseAtlasState(new URLSearchParams(location.search));
        if (this.resources.length) this.render();
      },
      { signal },
    );
    void this.loadIndex();
  }

  disconnectedCallback() {
    this.events?.abort();
    clearTimeout(this.searchTimer);
  }

  private get chinese() { return this.dataset.locale === "zh-cn"; }
  private t(english: string, chinese: string) { return this.chinese ? chinese : english; }
  private label(value: string) { return localizedAtlasLabel(value, this.chinese); }
  private path(path: string) {
    let target = localizedPath(path, this.chinese);
    // Keep the result population, display and comparison when opening a source record.
    if (/^\/(zh-cn\/)?atlas\/[^/?#]+\/(?:#.*)?$/u.test(target) && !target.includes("/browse/")) {
      const [pathname, hash] = target.split("#");
      target = `${pathname}${serializeAtlasState(this.state)}${hash ? `#${hash}` : ""}`;
    }
    return withSiteBase(target, this.dataset.siteBase ?? "/");
  }
  private link(path: string, text: string) {
    const link = element("a", text);
    link.href = this.path(path);
    return link;
  }
  private node<T extends HTMLElement = HTMLElement>(selector: string) {
    return this.querySelector<T>(selector)!;
  }

  private async loadIndex() {
    const status = this.node("[data-index-status]");
    const retry = this.node<HTMLButtonElement>("[data-retry-index]");
    status.hidden = false;
    status.textContent = this.t("Loading the searchable catalogue…", "正在加载可检索目录…");
    retry.hidden = true;
    try {
      const response = await fetch(this.dataset.indexUrl!, {
        signal: this.events?.signal,
      });
      if (!response.ok)
        throw new Error(`Search index returned ${response.status}`);
      const data: unknown = await response.json();
      if (
        !Array.isArray(data) ||
        !data.length ||
        !data.every(
          (record) =>
            record &&
            typeof record.id === "string" &&
            typeof record.name === "string" &&
            typeof record.summary === "string" &&
            Array.isArray(record.stages) &&
            Array.isArray(record.licenses) &&
            record.access_level &&
            record.status,
        ) ||
        new Set(data.map(({ id }) => id)).size !== data.length
      )
        throw new Error("Invalid search index");
      this.resources = data as AtlasSearchEntry[];
      this.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLButtonElement
      >(
        "[data-atlas-controls] input, [data-atlas-controls] select, [data-atlas-controls] button, [data-atlas-view], [data-atlas-sort], [data-atlas-export]",
      ).forEach((control) => {
        control.disabled = false;
      });
      this.state = parseAtlasState(new URLSearchParams(location.search));
      status.hidden = true;
      this.node("[data-initial-preview]").hidden = true;
      this.render();
    } catch (error) {
      if (this.events?.signal.aborted) return;
      status.textContent =
        this.t("The interactive index could not load. The preview and complete catalogue links remain available.", "交互索引未能加载。仍可浏览预览与完整目录。");
      retry.hidden = false;
    }
  }

  private applyFormQuery() {
    if (!this.form || !this.resources.length) return;
    clearTimeout(this.searchTimer);
    const data = new FormData(this.form);
    const query = Object.fromEntries(
      Object.keys(emptyAtlasQuery).map((key) => [
        key,
        String(data.get(key) ?? "").trim(),
      ]),
    ) as AtlasQuery;
    this.setState({ ...this.state, ...query });
  }

  private setState(state: AtlasState) {
    clearTimeout(this.searchTimer);
    if (
      serializeAtlasQuery(state) !== serializeAtlasQuery(this.state) ||
      state.sort !== this.state.sort
    ) {
      state = { ...state, page: 1 };
    }
    const search = serializeAtlasState(state);
    if (search !== serializeAtlasState(this.state))
      history.pushState(
        {},
        "",
        `${location.pathname}${search}${location.hash}`,
      );
    this.state = state;
    this.render();
  }

  private changePage(page: number) {
    this.setState({ ...this.state, page });
    this.node(".atlas-result-bar").scrollIntoView({ block: "start" });
    this.node<HTMLSelectElement>(
      '[data-pagination-position="top"] [data-atlas-page-select]',
    ).focus({ preventScroll: true });
  }

  private matched() {
    return sortAtlasResources(
      filterResources(this.resources, this.state),
      this.state,
      this.state.sort,
    );
  }

  private render() {
    const state = this.state;
    const results = this.matched();
    const pagination = paginateAtlasResources(results, state.page);
    state.page = pagination.page;
    if (
      (new URLSearchParams(location.search).get("page") ?? "") !==
      (state.page > 1 ? String(state.page) : "")
    ) {
      history.replaceState(
        {},
        "",
        `${location.pathname}${serializeAtlasState(state)}${location.hash}`,
      );
    }
    this.querySelectorAll<HTMLElement>("[data-atlas-pagination]").forEach(
      (navigation) => {
        navigation.hidden = state.view === "landscape" || !results.length;
        navigation.querySelector<HTMLElement>(
          "[data-page-range]",
        )!.textContent =
          this.t(`Showing ${pagination.from}–${pagination.to} of ${pagination.total} matching resources`, `显示第 ${pagination.from}–${pagination.to} 条，共 ${pagination.total} 条匹配资源`);
        navigation.querySelector<HTMLElement>(
          "[data-page-total]",
        )!.textContent = this.t(`of ${pagination.pages}`, `页，共 ${pagination.pages} 页`);
        const select = navigation.querySelector<HTMLSelectElement>(
          "[data-atlas-page-select]",
        )!;
        if (select.options.length !== pagination.pages) {
          select.replaceChildren(
            ...Array.from(
              { length: pagination.pages },
              (_, index) => new Option(String(index + 1), String(index + 1)),
            ),
          );
        }
        select.value = String(pagination.page);
        select.disabled = pagination.pages === 1;
        navigation.querySelector<HTMLButtonElement>(
          '[data-page-direction="-1"]',
        )!.disabled = pagination.page === 1;
        navigation.querySelector<HTMLButtonElement>(
          '[data-page-direction="1"]',
        )!.disabled = pagination.page === pagination.pages;
      },
    );
    for (const key of Object.keys(emptyAtlasQuery) as Array<keyof AtlasQuery>) {
      const field = this.form?.elements.namedItem(key);
      if (field instanceof HTMLSelectElement) {
        const population = filterResources(this.resources, {
          ...state,
          [key]: "",
        });
        [...field.options].forEach((option) => {
          const count = !option.value
            ? population.length
            : population.filter((resource) =>
                key === "stage"
                  ? resource.stages.includes(option.value)
                  : key === "kind"
                    ? resource.kind === option.value
                    : key === "access"
                      ? resource.access_level.value === option.value
                      : resource.status.value === option.value,
              ).length;
          option.textContent = `${option.value ? this.label(option.value) : field.dataset.allLabel} (${count})`;
        });
        if (
          state[key] &&
          ![...field.options].some(({ value }) => value === state[key])
        ) {
          field.add(
            new Option(`${this.label(state[key])} ${this.t("(0; shared URL)", "（0；分享链接条件）")}`, state[key]),
          );
        }
        field.value = state[key];
      } else if (field instanceof HTMLInputElement) field.value = state[key];
    }
    this.node<HTMLSelectElement>("[data-atlas-sort]").value = state.sort;
    this.querySelectorAll<HTMLButtonElement>("[data-atlas-view]").forEach(
      (button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.atlasView === state.view),
        );
      },
    );
    this.node("[data-result-count]").textContent =
      this.t(`${results.length} of ${this.resources.length} resources`, `${results.length} / ${this.resources.length} 项资源`);
    this.node("[data-scope-population]").textContent = this.t(`${results.length} matching records`, `${results.length} 条匹配记录`);
    this.node("[data-atlas-scope]").hidden = state.view === "landscape";
    const overviewKey = serializeAtlasQuery(state);
    if (overviewKey !== this.overviewKey || !this.node("[data-atlas-overview]").dataset.ready) {
      this.overviewKey = overviewKey;
      const overview = this.node("[data-atlas-overview]");
      overview.replaceChildren(...(results.length ? [this.landscape(results, true)] : [element("p", this.t("No records in this filtered population.", "当前筛选范围内没有记录。"), "atlas-help")]));
      overview.dataset.ready = "true";
    }
    this.node("[data-empty-state]").hidden = results.length !== 0;
    this.node<HTMLAnchorElement>("[data-share-query]").href =
      `${location.pathname}${serializeAtlasState(state)}`;
    const active = this.node("[data-active-filters]");
    const filters = activeAtlasFilters(state).map((filter) => ({ ...filter, label: this.chinese ? ({ q: "搜索", stage: "阶段", kind: "类型", access: "访问", lifecycle: "生命周期" }[filter.key]) : filter.label, value: filter.key === "q" ? filter.value : this.label(state[filter.key]) }));
    active.replaceChildren(
      ...filters.map((filter) => {
        const button = element(
          "button",
          `${filter.label}: ${filter.value} ×`,
          "filter-chip",
        );
        button.type = "button";
        button.dataset.removeFilter = filter.key;
        button.setAttribute(
          "aria-label",
          this.t(`Remove ${filter.label.toLowerCase()}: ${filter.value}`, `移除${filter.label}：${filter.value}`),
        );
        return button;
      }),
    );
    if (!filters.length) active.textContent = this.t("No active filters", "未设置筛选");
    this.form!.querySelector<HTMLButtonElement>('[type="reset"]')!.disabled =
      !filters.length;
    const key = `${serializeAtlasQuery(state)}|${state.sort}|${state.view}|${state.page}`;
    if (key !== this.resultsKey) {
      this.resultsKey = key;
      const list = this.node<HTMLUListElement>("[data-atlas-results]");
      const table = this.node("[data-atlas-table]");
      const landscape = this.node("[data-atlas-landscape]");
      list.hidden = state.view !== "list" || !results.length;
      table.hidden = state.view !== "table" || !results.length;
      landscape.hidden = state.view !== "landscape" || !results.length;
      list.replaceChildren(
        ...(state.view === "list"
          ? pagination.items.map((resource) => this.card(resource))
          : []),
      );
      table.replaceChildren(
        ...(state.view === "table" ? [this.resultTable(pagination.items)] : []),
      );
      landscape.replaceChildren(
        ...(state.view === "landscape" ? [this.landscape(results)] : []),
      );
    }
    this.querySelectorAll<HTMLInputElement>("[data-compare-id]").forEach(
      (control) => {
        control.checked = state.compare.includes(control.dataset.compareId!);
        control.disabled = state.compare.length >= 4 && !control.checked;
      },
    );
    void this.renderComparison();
  }

  private compareControl(resource: AtlasSearchEntry) {
    const label = element("label", "", "atlas-select");
    const input = element("input");
    input.type = "checkbox";
    input.dataset.compareId = resource.id;
    input.setAttribute("aria-label", this.t(`Compare ${resource.name}`, `比较 ${resource.name}`));
    label.append(input, element("span", this.t("Compare", "比较")));
    return label;
  }

  private card(resource: AtlasSearchEntry) {
    const li = element("li");
    li.dataset.resourceId = resource.id;
    const article = element("article", "", "resource-card atlas-result");
    const main = element("div", "", "atlas-result__main");
    const heading = element("h2");
    heading.append(this.link(`/atlas/${resource.id}/`, resource.name));
    main.append(
      element(
        "p",
        `${this.label(resource.kind)} · ${this.label(resource.status.value)}`,
        "meta-label",
      ),
      heading,
      element("p", resource.summary, "atlas-result__summary"),
    );
    if (resource.caveat) {
      const caveat = element("p", "", "atlas-result__caveat");
      caveat.append(
        element("span", this.t("Scope note: ", "范围说明：")),
        document.createTextNode(resource.caveat),
      );
      main.append(caveat);
    }
    const links = element("div", "", "atlas-result__links");
    links.append(
      this.link(
        `/atlas/${resource.id}/#evidence-title`,
        this.t(`${resource.sourceCount} recorded ${resource.sourceCount === 1 ? "source" : "sources"}`, `${resource.sourceCount} 条已记录来源`),
      ),
      this.link(`/atlas/${resource.id}/#openness-title`, this.t("7 asset dimensions", "7 个资产维度")),
      this.link(resource.canonical_url, this.t("Visit resource", "访问资源")),
    );
    main.append(links);
    const facts = element("dl", "", "atlas-result__facts");
    for (const [label, value] of [
      [this.t("Access", "访问"), this.label(resource.access_level.value)],
      [this.t("Lifecycle", "生命周期"), this.label(resource.status.value)],
      [this.t("Licences by scope", "按范围划分的许可"), this.licenseSummary(resource)],
      [this.t("Record checked", "记录核查日期"), resource.last_verified],
    ]) {
      const group = element("div");
      const dd = element("dd", label === this.t("Record checked", "记录核查日期") ? "" : value);
      if (label === this.t("Record checked", "记录核查日期")) {
        const time = element("time", value);
        time.dateTime = value;
        dd.append(time);
      }
      group.append(element("dt", label), dd);
      facts.append(group);
    }
    article.append(main, facts, this.compareControl(resource));
    li.append(article);
    return li;
  }

  private licenseSummary(resource: Pick<AtlasSearchEntry, "licenses">) {
    return resource.licenses.length
      ? resource.licenses
          .map(({ name, scope }) => `${name} (${scope})`)
          .join("; ")
      : this.t("No verified licence claim", "暂无已核实的许可声明");
  }

  private tableFrame(table: HTMLTableElement, label: string) {
    const region = element("div", "", "atlas-table-region");
    region.tabIndex = 0;
    region.setAttribute("role", "region");
    region.setAttribute("aria-label", label);
    region.append(table);
    return region;
  }

  private resultTable(resources: AtlasSearchEntry[]) {
    const table = element("table", "", "atlas-data-table");
    table.append(
      element(
        "caption",
        this.t("Current page of matching resource records. Access, lifecycle and licence scope are separate metadata.", "当前页的匹配资源记录。访问权限、生命周期与许可范围分别记录。"),
      ),
    );
    const head = element("thead");
    const tr = element("tr");
    [
      this.t("Resource / scientific purpose", "资源 / 科学用途"),
      this.t("Kind / scope", "类型 / 范围"),
      this.t("Access / lifecycle", "访问 / 生命周期"),
      this.t("Licences by scope", "按范围划分的许可"),
      this.t("Record checked", "记录核查日期"),
      this.t("Selection", "选择"),
    ].forEach((label) => {
      const th = element("th", label);
      th.scope = "col";
      tr.append(th);
    });
    head.append(tr);
    const body = element("tbody");
    for (const resource of resources) {
      const row = element("tr");
      row.dataset.resourceId = resource.id;
      const name = element("th");
      name.scope = "row";
      name.append(
        this.link(`/atlas/${resource.id}/`, resource.name),
        element("p", resource.summary),
      );
      const scope = element(
        "td",
        `${this.label(resource.kind)} · ${resource.stages.map((value) => this.label(value)).join(", ")}`,
      );
      const date = element("td");
      const time = element("time", resource.last_verified);
      time.dateTime = resource.last_verified;
      date.append(time);
      const selected = element("td");
      selected.append(this.compareControl(resource));
      row.append(
        name,
        scope,
        element(
          "td",
          `${this.label(resource.access_level.value)} / ${this.label(resource.status.value)}`,
        ),
        element("td", this.licenseSummary(resource)),
        date,
        selected,
      );
      body.append(row);
    }
    table.append(head, body);
    return this.tableFrame(table, this.t("Resource results table", "资源结果表"));
  }

  private landscape(resources: AtlasSearchEntry[], overview = false) {
    const matrix = atlasLandscape(resources);
    // A selected stage remains a constraint when drilling down a cell. Showing
    // other stages of multi-stage records would broaden that population on click.
    const rows = this.state.stage ? matrix.rows.filter(row => row.stage === this.state.stage) : matrix.rows;
    const maximum = Math.max(1, ...rows.flatMap(({ cells }) => cells.map(({ ids }) => ids.length)));
    const wrapper = element("div");
    if (!overview) wrapper.append(
      element(
        "p",
        this.t(`Stage × resource kind for the ${matrix.total} matching records. A resource can be listed under several stages; cells are not additive. Select a count to inspect its records.`, `${matrix.total} 条匹配记录的阶段 × 资源类型分布。一项资源可属于多个阶段，单元格不可相加。选择计数查看相应记录。`),
        "atlas-help",
      ),
    );
    const table = element(
      "table",
      "",
      `atlas-data-table atlas-landscape-table${overview ? " atlas-scope-table" : ""}`,
    );
    table.append(
      element(
        "caption",
        this.t("Catalogue landscape: record counts by declared pipeline stage and kind. Counts do not measure quality or performance.", "资源分布：按记录声明的阶段与类型计数。计数不衡量质量或性能。"),
      ),
    );
    const head = element("thead");
    const headRow = element("tr");
    for (const label of [this.t("Pipeline stage", "流程阶段"), ...matrix.kinds.map((value) => this.label(value))]) {
      const th = element("th", label);
      th.scope = "col";
      headRow.append(th);
    }
    head.append(headRow);
    const body = element("tbody");
    for (const { stage, cells } of rows) {
      const row = element("tr");
      const label = element(
        "th",
        stage ? this.label(stage) : this.t("Stage not recorded", "未记录阶段"),
      );
      label.scope = "row";
      row.append(label);
      for (const { kind, ids } of cells) {
        const cell = element("td");
        cell.dataset.population = String(ids.length);
        cell.style.setProperty("--cell-strength", String(ids.length / maximum));
        if (ids.length && stage) {
          const button = element(
            "button",
            String(ids.length),
            "atlas-landscape-count",
          );
          button.type = "button";
          if (overview) {
            button.dataset.scopeStage = stage;
            button.dataset.scopeKind = kind;
          } else {
            button.dataset.landscapeStage = stage;
            button.dataset.landscapeKind = kind;
          }
          button.setAttribute(
            "aria-label",
            this.t(`${ids.length} ${this.label(kind)} records at ${this.label(stage)}`, `${this.label(stage)}阶段的 ${ids.length} 条${this.label(kind)}记录`),
          );
          cell.append(button);
        } else if (ids.length) {
          cell.append(element("span", `${ids.length} — `));
          ids.forEach((id, index) => {
            if (index) cell.append(document.createTextNode(", "));
            cell.append(
              this.link(
                `/atlas/${id}/`,
                resources.find((resource) => resource.id === id)!.name,
              ),
            );
          });
        } else cell.textContent = "0";
        row.append(cell);
      }
      body.append(row);
    }
    table.append(head, body);
    const frame = this.tableFrame(table, overview ? this.t("Resource scope heatmap", "资源范围热图") : this.t("Resource landscape table", "资源分布表"));
    if (overview) frame.classList.add("atlas-scope__scroll");
    wrapper.append(frame);
    if (overview) return wrapper;
    const fallback = element("details");
    fallback.append(
      element(
        "summary",
        this.t(`Read the same ${resources.length} matching records as a list`, `以列表阅读相同的 ${resources.length} 条匹配记录`),
      ),
    );
    const list = element("ul");
    resources.forEach((resource) => {
      const li = element("li");
      li.append(
        this.link(`/atlas/${resource.id}/`, resource.name),
        document.createTextNode(
          ` — ${this.label(resource.kind)}; ${resource.stages.map((value) => this.label(value)).join(", ")}`,
        ),
      );
      list.append(li);
    });
    fallback.append(list);
    wrapper.append(fallback);
    return wrapper;
  }

  private sources(resource: Resource, ids?: string[], support?: string) {
    const sources = ids
      ? evidenceForIds(resource.evidence, ids)
      : evidenceForSupport(resource.evidence, support ?? "");
    const node = element("div", "", "atlas-cell-sources");
    if (!sources.length) node.textContent = this.t("No direct evidence recorded.", "未记录直接证据。");
    sources.forEach((source, index) => {
      if (index) node.append(document.createTextNode(" · "));
      node.append(this.link(source.url, source.label));
    });
    return node;
  }

  private async renderComparison() {
    const ids = this.state.compare;
    const key = ids.join(",");
    if (key === this.comparisonKey) return;
    this.comparisonKey = key;
    this.node("#compare").dataset.comparisonSize = String(ids.length);
    const version = ++this.comparisonVersion;
    const tray = this.node("[data-compare-tray]");
    tray.replaceChildren(
      ...ids.map((id) => {
        const resource = this.resources.find((entry) => entry.id === id);
        const li = element("li");
        li.append(
          resource
            ? this.link(`/atlas/${id}/`, resource.name)
            : element("span", id),
        );
        const remove = element("button", "×");
        remove.type = "button";
        remove.dataset.removeComparison = id;
        remove.setAttribute(
          "aria-label",
          this.t(`Remove ${resource?.name ?? id} from comparison`, `从比较中移除 ${resource?.name ?? id}`),
        );
        li.append(remove);
        return li;
      }),
    );
    if (!ids.length) tray.append(element("li", this.t("No resources selected", "尚未选择资源")));
    this.node<HTMLButtonElement>("[data-compare-clear]").disabled = !ids.length;
    const status = this.node("[data-compare-status]");
    const panel = this.node("[data-compare-panel]");
    panel.replaceChildren();
    panel.setAttribute("aria-busy", "false");
    if (ids.length < 2) {
      status.textContent = ids.length
        ? this.t("Choose at least one more resource to compare.", "请至少再选择一项资源进行比较。")
        : this.t("Select resources using the Compare controls in the results.", "使用结果中的“比较”控件选择资源。");
      return;
    }
    const unknown = ids.filter(
      (id) => !this.resources.some((resource) => resource.id === id),
    );
    if (unknown.length) {
      status.textContent = this.t(`Not in this catalogue: ${unknown.join(", ")}. Remove these selections to compare existing records.`, `目录中未找到：${unknown.join(", ")}。请移除这些选项后比较现有记录。`);
      return;
    }
    status.textContent = this.t(`Loading detailed evidence for ${ids.length} resources…`, `正在加载 ${ids.length} 项资源的详细证据…`);
    panel.setAttribute("aria-busy", "true");
    try {
      const resources = await Promise.all(
        ids.map(async (id) => {
          const cached = this.details.get(id);
          if (cached) return cached;
          const response = await fetch(
            this.path(`/data/resources/${id}.json`),
            { signal: this.events?.signal },
          );
          if (!response.ok)
            throw new Error(`Details returned ${response.status}`);
          const resource = (await response.json()) as Resource;
          if (
            resource.id !== id ||
            !resource.openness ||
            !Array.isArray(resource.evidence) ||
            !opennessDimensions.every(
              (dimension) =>
                resource.openness[dimension] &&
                Object.hasOwn(
                  assetStateLabels,
                  resource.openness[dimension].value,
                ),
            ) ||
            ![
              resource.stages,
              resource.tasks,
              resource.modalities,
              resource.licenses,
              resource.caveats,
            ].every(Array.isArray)
          )
            throw new Error("Detail record does not match the selection");
          this.details.set(id, resource);
          return resource;
        }),
      );
      if (version !== this.comparisonVersion || this.events?.signal.aborted)
        return;
      panel.replaceChildren(this.comparisonWorkspace(resources));
      status.textContent = this.t(`${resources.length} records compared. Select an asset state to inspect its own evidence. Metadata do not establish a performance ranking.${resources.length === 4 ? " Remove one selection to compare another record." : ""}`, `已比较 ${resources.length} 条记录。选择资产状态以检查其各自的证据。元数据不构成性能排名。${resources.length === 4 ? "请移除一项后再比较其他记录。" : ""}`);
    } catch (error) {
      if (version !== this.comparisonVersion || this.events?.signal.aborted)
        return;
      status.textContent =
        this.t("Some detailed evidence could not load. Retry, or open the selected records above to inspect their sources.", "部分详细证据未能加载。请重试，或打开上方所选记录检查来源。");
      const retry = element("button", this.t("Retry comparison", "重试比较"));
      retry.type = "button";
      retry.dataset.retryComparison = "";
      panel.append(retry);
    } finally {
      if (version === this.comparisonVersion)
        panel.setAttribute("aria-busy", "false");
    }
  }

  private comparisonWorkspace(resources: Resource[]) {
    const workspace = element("div", "", "atlas-evidence-workspace");
    const profiles = element("div", "", "atlas-asset-profiles");
    profiles.style.setProperty("--comparison-columns", String(resources.length));
    const inspector = element("section", "", "atlas-claim-inspector");
    inspector.tabIndex = -1;
    inspector.setAttribute("aria-label", this.t("Selected asset evidence", "所选资产证据"));
    const symbols: Record<string, string> = { available: "✓", not_available: "—", not_applicable: "∅", unverified: "?" };
    const inspect = (resource: Resource, dimension: (typeof opennessDimensions)[number]) => {
      const claim = resource.openness[dimension];
      profiles.querySelectorAll<HTMLButtonElement>("[data-inspect-asset]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.inspectAsset === `${resource.id}:${dimension}`)));
      inspector.replaceChildren(
        element("p", resource.name, "meta-label"),
        element("h3", `${this.label(dimension)} · ${this.label(claim.value)}`),
        this.sources(resource, claim.evidence),
        element("p", this.t(`Record checked ${resource.last_verified}. This claim describes only this asset dimension. Access and licence permissions remain separate.`, `记录核查日期 ${resource.last_verified}。此主张仅描述该资产维度。访问与许可条件分别记录。`), "atlas-help"),
        this.link(`/atlas/${resource.id}/#openness-title`, this.t("Open the complete evidence record →", "打开完整证据记录 →")),
      );
    };
    for (const resource of resources) {
      const profile = element("article", "", "atlas-asset-profile");
      const heading = element("h3");
      heading.append(this.link(`/atlas/${resource.id}/`, resource.name));
      const date = element("time", resource.last_verified);
      date.dateTime = resource.last_verified;
      const facts = element("p", `${this.label(resource.access_level.value)} · ${this.label(resource.status.value)}`, "atlas-help");
      const strip = element("div", "", "atlas-asset-strip");
      strip.setAttribute("role", "group");
      strip.setAttribute("aria-label", this.t(`${resource.name}: seven independent asset dimensions`, `${resource.name}：七个独立资产维度`));
      opennessDimensions.forEach((dimension) => {
        const value = resource.openness[dimension].value;
        const button = element("button", "", `atlas-asset-state atlas-asset-state--${value}`);
        button.type = "button";
        button.dataset.inspectAsset = `${resource.id}:${dimension}`;
        button.setAttribute("aria-pressed", "false");
        button.setAttribute("aria-label", `${resource.name}, ${this.label(dimension)}: ${this.label(value)}`);
        const symbol = element("i", symbols[value] ?? "?");
        symbol.setAttribute("aria-hidden", "true");
        button.append(element("span", this.label(dimension)), symbol);
        button.addEventListener("click", () => inspect(resource, dimension));
        strip.append(button);
      });
      profile.append(heading, date, facts, strip, element("p", this.licenseSummary(resource), "atlas-profile-licence"));
      profiles.append(profile);
    }
    workspace.append(element("p", this.t("✓ Available   ·   — Not available   ·   ∅ Not applicable   ·   ? Unverified", "✓ 可用   ·   — 不可用   ·   ∅ 不适用   ·   ? 未核实"), "atlas-asset-key"), profiles, inspector);
    inspect(resources[0], "inference_code");
    const fallback = element("details", "", "atlas-comparison-fallback");
    fallback.append(element("summary", this.t("Full comparison table · scope, licences, all claims and sources", "完整比较表 · 范围、许可、全部主张与来源")), this.comparisonTable(resources));
    workspace.append(fallback);
    return workspace;
  }

  private comparisonTable(resources: Resource[]) {
    const table = element(
      "table",
      "",
      "atlas-data-table atlas-comparison-table",
    );
    table.append(
      element(
        "caption",
        this.t("Resource comparison. Available, not available, not applicable and unverified are distinct states. Unverified does not mean unavailable. Sources apply only to the adjacent claim.", "资源比较。可用、不可用、不适用和未核实是不同状态。未核实不等于不可用；来源仅支持相邻主张。"),
      ),
    );
    const head = element("thead");
    const heading = element("tr");
    const corner = element("th", this.t("Claim / asset", "主张 / 资产"));
    corner.scope = "col";
    heading.append(corner);
    resources.forEach((resource) => {
      const th = element("th");
      th.scope = "col";
      th.append(this.link(`/atlas/${resource.id}/`, resource.name));
      const date = element("p", this.t("Record checked ", "记录核查日期 "));
      const time = element("time", resource.last_verified);
      time.dateTime = resource.last_verified;
      date.append(time);
      th.append(date);
      heading.append(th);
    });
    head.append(heading);
    const body = element("tbody");
    const row = (
      label: string,
      render: (resource: Resource, cell: HTMLTableCellElement) => void,
      dimension?: string,
    ) => {
      const tr = element("tr");
      if (dimension) tr.dataset.dimension = dimension;
      const th = element("th", label);
      th.scope = "row";
      tr.append(th);
      resources.forEach((resource) => {
        const td = element("td");
        td.dataset.comparisonResource = resource.id;
        render(resource, td);
        tr.append(td);
      });
      body.append(tr);
    };
    row(this.t("Scientific purpose", "科学用途"), (resource, cell) =>
      cell.append(
        element("p", resource.summary),
        this.sources(resource, undefined, "summary"),
      ),
    );
    for (const [label, field] of [
      [this.t("Pipeline stages", "流程阶段"), "stages"],
      [this.t("Tasks", "任务"), "tasks"],
      [this.t("Modalities", "模态"), "modalities"],
    ] as const) {
      row(label, (resource, cell) =>
        cell.append(
          element(
            "p",
            resource[field].length
              ? resource[field].map((value) => this.label(value)).join(", ")
              : this.t("Not recorded", "未记录"),
          ),
          this.sources(resource, undefined, field),
        ),
      );
    }
    for (const [label, field] of [
      [this.t("Access", "访问"), "access_level"],
      [this.t("Lifecycle", "生命周期"), "status"],
    ] as const) {
      row(label, (resource, cell) =>
        cell.append(
          element("p", this.label(resource[field].value)),
          this.sources(resource, resource[field].evidence),
        ),
      );
    }
    row(this.t("Licences by scope", "按范围划分的许可"), (resource, cell) => {
      if (!resource.licenses.length) {
        cell.textContent = this.t("No verified licence claim", "暂无已核实的许可声明");
        return;
      }
      const list = element("ul");
      resource.licenses.forEach((license) => {
        const li = element("li", `${license.name} (${license.scope})`);
        li.append(this.sources(resource, license.evidence));
        list.append(li);
      });
      cell.append(list);
    });
    for (const asset of comparisonAssetRows(resources)) {
      row(
        this.label(asset.dimension),
        (resource, cell) => {
          const claim = resource.openness[asset.dimension];
          cell.dataset.assetState = claim.value;
          cell.append(
            element(
              "strong",
              this.label(claim.value),
              `atlas-state atlas-state--${claim.value}`,
            ),
            this.sources(resource, claim.evidence),
          );
        },
        asset.dimension,
      );
    }
    row(this.t("Caveats and evaluation limits", "注意事项与评估局限"), (resource, cell) => {
      const list = element("ul");
      resource.caveats.forEach((caveat) => list.append(element("li", caveat)));
      if (!resource.caveats.length)
        cell.append(element("p", this.t("No caveats recorded.", "未记录注意事项。")));
      cell.append(list, this.sources(resource, undefined, "caveats"));
    });
    table.append(head, body);
    return this.tableFrame(table, this.t("Selected resource comparison", "所选资源比较"));
  }

  private exportResults() {
    const blob = new Blob([JSON.stringify(this.matched(), null, 2) + "\n"], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = this.link(url, "");
    link.download = "atlas-matching-records.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
