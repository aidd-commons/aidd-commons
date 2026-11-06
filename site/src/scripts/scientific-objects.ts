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
    const labels = root.querySelector<HTMLInputElement>("[data-object-labels]")!;
    const yaw = root.querySelector<HTMLInputElement>("[data-object-yaw]")!;
    const pitch = root.querySelector<HTMLInputElement>("[data-object-pitch]")!;
    const button = root.querySelector<HTMLButtonElement>("[data-object-enable]")!;
    const status = root.querySelector<HTMLElement>("[data-object-status]")!;
    const scaleBar = root.querySelector<HTMLElement>("[data-object-scale]")!;
    const chinese = root.dataset.chinese === "true";
    const structure = root.dataset.objectKind === "egfr";
    const contactList = root.querySelector<HTMLElement>("[data-object-contact-list]");
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
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(bounds.width, 240);
      const height = Math.max(bounds.height, 140);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      const selected = state.contacts.find(contact => `${contact.chain}:${contact.author_seq}` === residue?.value);
      const atoms = selected ? [...state.atoms, ...selected.atoms.map(atom => ({...atom,kind:"selected"}))] : state.atoms;
      const yAngle = Number(yaw.value) * Math.PI/180;
      const pAngle = Number(pitch.value) * Math.PI/180;
      const rotate = ([x,y,z]:number[]) => {
        const xx=x*Math.cos(yAngle)+z*Math.sin(yAngle), zz=-x*Math.sin(yAngle)+z*Math.cos(yAngle);
        return [xx,y*Math.cos(pAngle)-zz*Math.sin(pAngle),y*Math.sin(pAngle)+zz*Math.cos(pAngle)];
      };
      const ligand = atoms.map((atom,index)=>atom.kind === "ligand" ? index : -1).filter(index=>index>=0);
      const marked = atoms.map((atom,index)=>atom.kind === "selected" ? index : -1).filter(index=>index>=0);
      let closest: [number,number] | undefined;
      let distance = Infinity;
      for (const a of ligand) for (const b of marked) {
        const gap = Math.hypot(...atoms[a].xyz.map((value,axis)=>value-atoms[b].xyz[axis]));
        if (gap<distance) {distance=gap;closest=[a,b];}
      }
      const styles = getComputedStyle(root);
      const background = styles.getPropertyValue("--atlas-panel").trim() || "#fffdf7";
      const ink = styles.getPropertyValue("--atlas-ink").trim() || "#17313c";
      const muted = styles.getPropertyValue("--atlas-muted").trim() || "#59707a";
      const teal = styles.getPropertyValue("--atlas-teal-deep").trim() || "#126f73";
      ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.lineCap="round";
      const split = structure && width < 576;
      const views = structure ? [
        {x:0,y:0,w:split?canvas.width:canvas.width*.46,h:split?canvas.height*.44:canvas.height,detail:false,label:chinese?"整体 · Cα 轨迹":"Context · Cα trace"},
        {x:split?0:canvas.width*.46,y:split?canvas.height*.44:0,w:split?canvas.width:canvas.width*.54,h:split?canvas.height*.56:canvas.height,detail:true,label:chinese?"局部 · 配体 + 选中残基":"Detail · ligand + selected residue"},
      ] : [{x:0,y:0,w:canvas.width,h:canvas.height,detail:false,label:chinese?"源坐标 · Å":"Source coordinates · Å"}];
      for (const view of views) {
        ctx.save();ctx.beginPath();ctx.rect(view.x,view.y,view.w,view.h);ctx.clip();
        const indices=atoms.map((_,index)=>index).filter(index=>!view.detail || atoms[index].kind!=="backbone");
        const center=[0,1,2].map(axis=>indices.reduce((sum,index)=>sum+atoms[index].xyz[axis],0)/indices.length);
        const projected=atoms.map(atom=>rotate(atom.xyz.map((value,axis)=>value-center[axis])));
        const xs=indices.map(index=>projected[index][0]),ys=indices.map(index=>projected[index][1]);
        const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
        const scale=Math.min((view.w-56*ratio)/Math.max(maxX-minX,1),(view.h-90*ratio)/Math.max(maxY-minY,1));
        const xy=projected.map(point=>[view.x+view.w/2+(point[0]-(maxX+minX)/2)*scale,view.y+view.h/2-(point[1]-(maxY+minY)/2)*scale,point[2]]);
        const visible=new Set(indices);
        for (const [a,b] of state.links) {
          if (!visible.has(a)||!visible.has(b)) continue;
          ctx.beginPath();ctx.moveTo(xy[a][0],xy[a][1]);ctx.lineTo(xy[b][0],xy[b][1]);
          ctx.strokeStyle=state.atoms[a].kind==="backbone"?muted:ink;
          ctx.globalAlpha=state.atoms[a].kind==="backbone"?.5:1;
          ctx.lineWidth=(state.atoms[a].kind==="backbone"?1:1.6)*ratio;ctx.stroke();ctx.globalAlpha=1;
        }
        if (closest) {
          ctx.beginPath();ctx.moveTo(xy[closest[0]][0],xy[closest[0]][1]);ctx.lineTo(xy[closest[1]][0],xy[closest[1]][1]);
          ctx.strokeStyle=teal;ctx.lineWidth=1.5*ratio;ctx.setLineDash([4*ratio,4*ratio]);ctx.stroke();ctx.setLineDash([]);
          if (view.detail && width >= 576) {
            ctx.font=`600 ${12*ratio}px system-ui`;ctx.fillStyle=ink;ctx.strokeStyle=background;ctx.lineWidth=4*ratio;
            const text=`${distance.toFixed(3)} Å`,x=(xy[closest[0]][0]+xy[closest[1]][0])/2+5*ratio,y=(xy[closest[0]][1]+xy[closest[1]][1])/2-7*ratio;
            ctx.strokeText(text,x,y);ctx.fillText(text,x,y);
          }
        }
        const order=[...indices].sort((a,b)=>xy[a][2]-xy[b][2]);
        for (const index of order) {
          const atom=atoms[index];
          const highlight=atom.kind==="backbone"&&selected&&atom.chain===selected.chain&&atom.author_seq===selected.author_seq;
          if (atom.kind==="backbone"&&!highlight) continue;
          const radius=(atom.element==="H"?3:atom.kind==="selected"?3.5:4.5)*ratio;
          ctx.fillStyle=({C:ink,N:"#345f9e",O:"#b94e54",S:"#a78324",F:"#358363",CL:"#358363",H:background} as Record<string,string>)[atom.element]??muted;
          ctx.beginPath();ctx.arc(xy[index][0],xy[index][1],highlight?6*ratio:radius,0,2*Math.PI);ctx.fill();ctx.strokeStyle=highlight?teal:ink;ctx.lineWidth=(highlight?2:.7)*ratio;ctx.stroke();
          if ((labels.checked || (closest?.includes(index)&&view.detail))&&atom.kind!=="backbone") {
            ctx.font=`${12*ratio}px system-ui`;ctx.fillStyle=ink;ctx.strokeStyle=background;ctx.lineWidth=3*ratio;
            const name=view.detail && width<576 ? atom.name : atom.element+"·"+atom.name;
            ctx.strokeText(name,xy[index][0]+7*ratio,xy[index][1]-6*ratio);ctx.fillText(name,xy[index][0]+7*ratio,xy[index][1]-6*ratio);
          }
        }
        ctx.fillStyle=muted;ctx.font=`${12*ratio}px system-ui`;ctx.fillText(view.label,view.x+12*ratio,view.y+20*ratio);
        const unit=view.detail?2:Number(root.dataset.scaleAngstrom);
        const length=unit*scale,barX=view.x+view.w-18*ratio,barY=view.y+view.h-20*ratio;
        ctx.strokeStyle=ink;ctx.lineWidth=ratio;ctx.beginPath();ctx.moveTo(barX-length,barY);ctx.lineTo(barX,barY);ctx.moveTo(barX-length,barY-3*ratio);ctx.lineTo(barX-length,barY+3*ratio);ctx.moveTo(barX,barY-3*ratio);ctx.lineTo(barX,barY+3*ratio);ctx.stroke();ctx.fillStyle=ink;ctx.fillText(`${unit} Å`,barX-length,barY-7*ratio);
        const origin=[view.x+28*ratio,view.y+view.h-22*ratio];
        [[1,0,0],[0,1,0],[0,0,1]].forEach((vector,index)=>{const point=rotate(vector);const end=[origin[0]+point[0]*16*ratio,origin[1]-point[1]*16*ratio];ctx.beginPath();ctx.moveTo(origin[0],origin[1]);ctx.lineTo(end[0],end[1]);ctx.strokeStyle=muted;ctx.stroke();ctx.fillStyle=muted;ctx.fillText(["x","y","z"][index],end[0]+3*ratio,end[1]-2*ratio);});
        ctx.restore();
      }
      if (structure) {
        ctx.strokeStyle=muted;ctx.globalAlpha=.3;ctx.lineWidth=ratio;ctx.beginPath();
        if (split) {ctx.moveTo(0,canvas.height*.44);ctx.lineTo(canvas.width,canvas.height*.44);} else {ctx.moveTo(canvas.width*.46,0);ctx.lineTo(canvas.width*.46,canvas.height);}ctx.stroke();ctx.globalAlpha=1;
      }
      if (selected && closest) {
        root.querySelector<HTMLElement>("[data-object-distance]")!.textContent=`${selected.minimum_distance_angstrom.toFixed(3)} Å`;
        root.querySelector<HTMLElement>("[data-object-pair]")!.textContent=`${state.id} · ${selected.residue} ${selected.reference_seq??"—"} · ${selected.chain} / ${selected.author_seq} · ${atoms[closest[0]].name} ↔ ${atoms[closest[1]].name}`;
        status.textContent=`${state.id} · ${selected.residue} ${selected.reference_seq??"—"} · ${selected.chain} / ${selected.author_seq} · ${chinese?"最短重原子距离 ":"Minimum heavy-atom distance "}${selected.minimum_distance_angstrom.toFixed(3)} Å. ${chinese?"虚线仅标示几何距离，不建立氢键、亲和力或功能。":"The dashed guide locates this geometric distance; it does not establish a hydrogen bond, affinity or function."}`;
      } else {
        const distanceOutput=root.querySelector<HTMLElement>("[data-object-distance]");if(distanceOutput)distanceOutput.textContent="—";
        const pairOutput=root.querySelector<HTMLElement>("[data-object-pair]");if(pairOutput)pairOutput.textContent=chinese?"选择残基以检查实际原子对距离。":"Select a residue to inspect its retained atom-pair distance.";
        status.textContent=`${state.label} · ${chinese?"观察方向改变，坐标与科学结果保持不变。":"Viewing direction changes; coordinates and scientific results remain fixed."}`;
      }
      root.querySelectorAll<HTMLElement>("[data-contact-row]").forEach(row=>row.classList.toggle("is-selected",row.dataset.contactRow===`${state.id}:${residue?.value}`));
      contactList?.querySelectorAll<HTMLButtonElement>("button").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.contact===residue?.value)));
    }

    function updateContacts(): void {
      const state=states[Number(selector.value)];
      contactList?.replaceChildren(...state.contacts.map(contact=>{
        const item=document.createElement("button");item.type="button";item.dataset.contact=`${contact.chain}:${contact.author_seq}`;
        item.textContent=`${contact.residue} ${contact.reference_seq??"—"} · ${contact.minimum_distance_angstrom.toFixed(2)} Å`;
        item.setAttribute("aria-pressed",String(item.dataset.contact===residue?.value));
        item.addEventListener("click",()=>{if(residue)residue.value=item.dataset.contact!;draw();});return item;
      }));
    }

    function reset(): void { yaw.value = "35"; pitch.value = "-20"; draw(); }
    button.addEventListener("click", () => {
      context = canvas.getContext("2d");
      if (!context) {
        status.textContent = chinese ? "当前浏览器无法绘制 Canvas；静态投影和数据表仍可阅读。" : "Canvas is unavailable in this browser; the static projection and tables remain readable.";
        return;
      }
      enabled = true;
      root.querySelector(".science-object__stage")?.classList.add("is-interactive");
      scaleBar.hidden = true;
      root.querySelector<HTMLElement>(".science-object__projection")!.hidden = true;
      const inspector=root.querySelector<HTMLElement>("[data-object-contact-inspector]");if(inspector)inspector.hidden=false;
      if(residue && !residue.value && states[Number(selector.value)].contacts.length)residue.value=`${states[Number(selector.value)].contacts[0].chain}:${states[Number(selector.value)].contacts[0].author_seq}`;
      updateContacts();
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
      updateContacts();
      status.textContent = `${state.label} · ${chinese ? "静态投影；下方保留完整来源表。" : "Static projection; complete source tables remain below."}`;
      draw();
    });
    yaw.addEventListener("input", draw);
    pitch.addEventListener("input", draw);
    residue?.addEventListener("change", draw);
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
