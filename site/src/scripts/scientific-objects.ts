type Atom = {
  xyz: number[];
  element: string;
  name: string;
  kind: string;
  chain?: string;
  author_seq?: number;
};
type Contact = {
  chain: string;
  author_seq: number;
  reference_seq: number | null;
  residue: string;
  atoms: Atom[];
  minimum_distance_angstrom: number;
};
type CoordinateState = {
  id: string;
  label: string;
  metadata: string;
  atoms: Atom[];
  links: number[][];
  contacts: Contact[];
  preview: string;
  previewScalePercent: number;
};

/** Orthographic inspection of retained coordinates, with no remote or chemistry inference. */
export function initializeScientificObjects(): void {
  document.querySelectorAll<HTMLElement>("[data-science-object]").forEach(root => {
    if (root.dataset.initialized) return;
    root.dataset.initialized = "true";
    const states = JSON.parse(root.dataset.objectStates ?? "[]") as CoordinateState[];
    const canvas = root.querySelector<HTMLCanvasElement>("[data-object-canvas]")!;
    const image = root.querySelector<HTMLImageElement>("[data-object-preview]")!;
    const selector = root.querySelector<HTMLSelectElement>("[data-object-select]")!;
    const residue = root.querySelector<HTMLSelectElement>("[data-object-residue]");
    const extent = root.querySelector<HTMLSelectElement>("[data-object-mode]");
    const labels = root.querySelector<HTMLInputElement>("[data-object-labels]")!;
    const yaw = root.querySelector<HTMLInputElement>("[data-object-yaw]")!;
    const pitch = root.querySelector<HTMLInputElement>("[data-object-pitch]")!;
    const button = root.querySelector<HTMLButtonElement>("[data-object-enable]")!;
    const status = root.querySelector<HTMLElement>("[data-object-status]")!;
    const scaleBar = root.querySelector<HTMLElement>("[data-object-scale]")!;
    const chinese = root.dataset.chinese === "true";
    let enabled = false;
    let context: CanvasRenderingContext2D | null = null;

    function updateAngleReadouts(): void {
      root.querySelector<HTMLOutputElement>("[data-object-yaw-output]")!.textContent = `${yaw.value}°`;
      root.querySelector<HTMLOutputElement>("[data-object-pitch-output]")!.textContent = `${pitch.value}°`;
    }

    function draw(): void {
      updateAngleReadouts();
      if (!enabled || !context) return;
      const state = states[Number(selector.value)];
      if (!state) return;
      const ctx = context;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(canvas.getBoundingClientRect().width, 240);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(width * 440 / 760 * ratio);
      const selected = state.contacts.find(contact => `${contact.chain}:${contact.author_seq}` === residue?.value);
      const atoms = selected
        ? [...state.atoms, ...selected.atoms.map(atom => ({ ...atom, kind: "selected" }))]
        : state.atoms;
      const indices = atoms.map((_, index) => index).filter(index => extent?.value !== "ligand" || atoms[index].kind !== "backbone");
      const center = [0, 1, 2].map(axis => indices.reduce((sum, index) => sum + atoms[index].xyz[axis], 0) / indices.length);
      const yAngle = Number(yaw.value) * Math.PI / 180;
      const pAngle = Number(pitch.value) * Math.PI / 180;
      const rotate = ([x, y, z]: number[]) => {
        const xx = x * Math.cos(yAngle) + z * Math.sin(yAngle);
        const zz = -x * Math.sin(yAngle) + z * Math.cos(yAngle);
        return [xx, y * Math.cos(pAngle) - zz * Math.sin(pAngle), y * Math.sin(pAngle) + zz * Math.cos(pAngle)];
      };
      const projected = atoms.map(atom => rotate(atom.xyz.map((value, axis) => value - center[axis])));
      const xs = indices.map(index => projected[index][0]);
      const ys = indices.map(index => projected[index][1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const scale = Math.min((canvas.width - 56 * ratio) / Math.max(maxX - minX, 1), (canvas.height - 85 * ratio) / Math.max(maxY - minY, 1));
      const xy = projected.map(point => [canvas.width / 2 + (point[0] - (maxX + minX) / 2) * scale, canvas.height / 2 - (point[1] - (maxY + minY) / 2) * scale, point[2]]);
      const visible = new Set(indices);
      ctx.fillStyle = "#f8fafb";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      for (const [a, b] of state.links) {
        if (!visible.has(a) || !visible.has(b)) continue;
        ctx.beginPath();
        ctx.moveTo(xy[a][0], xy[a][1]);
        ctx.lineTo(xy[b][0], xy[b][1]);
        ctx.strokeStyle = state.atoms[a].kind === "backbone" ? "#91a9b5" : "#485e6b";
        ctx.lineWidth = (state.atoms[a].kind === "backbone" ? 1.1 : 1.7) * ratio;
        ctx.stroke();
      }
      // A dashed guide locates the retained minimum-distance pair; it is not a bond.
      if (selected) {
        const ligand = indices.filter(index => atoms[index].kind === "ligand");
        const marked = indices.filter(index => atoms[index].kind === "selected");
        let closest: [number, number] | undefined;
        let distance = Infinity;
        for (const a of ligand) for (const b of marked) {
          const gap = Math.hypot(...atoms[a].xyz.map((value, axis) => value - atoms[b].xyz[axis]));
          if (gap < distance) { distance = gap; closest = [a, b]; }
        }
        if (closest) {
          ctx.beginPath();
          ctx.moveTo(xy[closest[0]][0], xy[closest[0]][1]);
          ctx.lineTo(xy[closest[1]][0], xy[closest[1]][1]);
          ctx.strokeStyle = "#996620";
          ctx.lineWidth = 1.5 * ratio;
          ctx.setLineDash([4 * ratio, 4 * ratio]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      const order = [...indices].sort((a, b) => xy[a][2] - xy[b][2]);
      for (const index of order) {
        const atom = atoms[index];
        const marked = atom.kind === "backbone" && selected && atom.chain === selected.chain && atom.author_seq === selected.author_seq;
        if (atom.kind === "backbone" && !marked) continue;
        const radius = (atom.element === "H" ? 3.5 : atom.kind === "selected" ? 4 : 5) * ratio;
        ctx.fillStyle = ({ C: "#4b606c", N: "#345f9e", O: "#b94e54", S: "#a78324", F: "#358363", CL: "#358363", H: "#eef2f4" } as Record<string, string>)[atom.element] ?? "#64748b";
        ctx.beginPath();
        ctx.arc(xy[index][0], xy[index][1], marked ? 7 * ratio : radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = marked ? "#996620" : "#344653";
        ctx.lineWidth = (marked ? 2 : .7) * ratio;
        ctx.stroke();
        if (labels.checked && atom.kind !== "backbone") {
          ctx.font = `${12 * ratio}px system-ui`;
          ctx.fillStyle = "#263c49";
          ctx.strokeStyle = "#f8fafb";
          ctx.lineWidth = 3 * ratio;
          const name = atom.element + "·" + atom.name;
          ctx.strokeText(name, xy[index][0] + 7 * ratio, xy[index][1] - 6 * ratio);
          ctx.fillText(name, xy[index][0] + 7 * ratio, xy[index][1] - 6 * ratio);
        }
      }
      // Project source-coordinate axes through the same camera as the atoms.
      const origin = [29 * ratio, canvas.height - 27 * ratio];
      const basis = [[1,0,0],[0,1,0],[0,0,1]];
      basis.forEach((vector, index) => {
        const point = rotate(vector);
        const end = [origin[0] + point[0] * 18 * ratio, origin[1] - point[1] * 18 * ratio];
        ctx.beginPath();ctx.moveTo(...origin as [number, number]);ctx.lineTo(...end as [number, number]);
        ctx.strokeStyle = "#485e6b";ctx.lineWidth = ratio;ctx.stroke();
        ctx.fillStyle = "#485e6b";ctx.font = `${11 * ratio}px system-ui`;ctx.fillText(["x","y","z"][index],end[0]+3*ratio,end[1]-2*ratio);
      });
      scaleBar.style.width = `${Number(root.dataset.scaleAngstrom) * scale / canvas.width * 100}%`;
      if (selected) {
        status.textContent = `${state.id} · ${selected.residue} ${selected.reference_seq ?? "—"} · ${selected.chain} / ${selected.author_seq} · ${chinese ? "最短重原子距离 " : "Minimum heavy-atom distance "}${selected.minimum_distance_angstrom.toFixed(3)} Å. ${chinese ? "虚线仅标示该几何距离，不建立氢键、亲和力或功能。" : "The dashed guide locates this geometric distance; it does not establish a hydrogen bond, affinity or function."}`;
      } else {
        status.textContent = `${state.label} · ${chinese ? "观察方向改变，坐标与科学结果保持不变。" : "Viewing direction changes; coordinates and scientific results remain fixed."}`;
      }
    }

    function reset(): void { yaw.value = "35"; pitch.value = "-20"; draw(); }
    button.addEventListener("click", () => {
      context = canvas.getContext("2d");
      if (!context) {
        status.textContent = chinese ? "当前浏览器无法绘制 Canvas；静态投影和数据表仍可阅读。" : "Canvas is unavailable in this browser; the static projection and tables remain readable.";
        return;
      }
      enabled = true;
      image.hidden = true;
      canvas.hidden = false;
      root.querySelector<HTMLElement>("[data-object-controls]")!.hidden = false;
      button.hidden = true;
      draw();
    });
    selector.addEventListener("change", () => {
      const state = states[Number(selector.value)];
      if (!state) return;
      image.src = state.preview;
      image.alt = (chinese ? "实际坐标正交投影：" : "Orthographic projection of actual coordinates: ") + state.label;
      root.querySelector<HTMLElement>("[data-object-title]")!.textContent = state.label;
      root.querySelector<HTMLElement>("[data-object-metadata]")!.textContent = state.metadata;
      scaleBar.style.width = `${state.previewScalePercent}%`;
      residue?.replaceChildren(new Option(chinese ? "不突出显示残基" : "No residue highlighted", ""), ...state.contacts.map(contact => new Option(`${contact.residue} ${contact.reference_seq ?? "—"} · ${contact.chain}`, `${contact.chain}:${contact.author_seq}`)));
      status.textContent = `${state.label} · ${chinese ? "静态投影；下方保留完整来源表。" : "Static projection; complete source tables remain below."}`;
      draw();
    });
    yaw.addEventListener("input", draw);
    pitch.addEventListener("input", draw);
    residue?.addEventListener("change", draw);
    extent?.addEventListener("change", draw);
    labels.addEventListener("change", draw);
    root.querySelector("[data-object-reset]")?.addEventListener("click", reset);
    canvas.addEventListener("keydown", event => {
      if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") { reset(); return; }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") yaw.value = String(Math.max(-180, Math.min(180, Number(yaw.value) + (event.key === "ArrowLeft" ? -5 : 5))));
      else pitch.value = String(Math.max(-90, Math.min(90, Number(pitch.value) + (event.key === "ArrowDown" ? -5 : 5))));
      draw();
    });
    let drag: { x: number; y: number; yaw: number; pitch: number } | undefined;
    canvas.addEventListener("pointerdown", event => { if (event.button !== 0) return; drag = {x:event.clientX,y:event.clientY,yaw:Number(yaw.value),pitch:Number(pitch.value)};canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener("pointermove", event => {
      if (!drag) return;
      yaw.value = String(Math.round(Math.max(-180, Math.min(180, drag.yaw + (event.clientX - drag.x) * .5))));
      pitch.value = String(Math.round(Math.max(-90, Math.min(90, drag.pitch - (event.clientY - drag.y) * .5))));
      draw();
    });
    canvas.addEventListener("pointerup", () => { drag = undefined; });
    canvas.addEventListener("pointercancel", () => { drag = undefined; });
    const observer = new ResizeObserver(() => { if (enabled) draw(); });
    observer.observe(root.querySelector(".science-object__stage")!);
    document.addEventListener("astro:before-swap", () => observer.disconnect(), {once:true});
  });
}
