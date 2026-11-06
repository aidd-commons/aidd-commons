/** Parse the simple SSR source table while tolerating Astro's scoped attributes. */
export function figureSourceRows(html:string):string[][]{
 const section=html.match(/<section\b[^>]*\bid=["']figure-source-table["'][^>]*>([\s\S]*?)<\/section>/i)?.[1];
 if(section===undefined)throw new Error('Missing figure-source-table section');
 const body=section.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1];
 if(body===undefined)throw new Error('Missing figure source table body');
 const decode=(s:string)=>s.replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&quot;','"').replaceAll('&apos;',"'").replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n:string)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10)));
 return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell=>decode(cell[1].replace(/<[^>]*>/g,''))));
}
