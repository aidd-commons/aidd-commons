"""Shared-source web projection. No experiment or manually copied metric values."""
from __future__ import annotations
import csv
import io
import json
import subprocess
import sys
from pathlib import Path
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'report/figures'))
from plot_data import load_plot_data
ORDER=['S1','S2','S3','S4','P1','P3','S6','P6','P7','S5','P2','P5','P4','S7','P8','P9','P11','P12','P10','P13']
KEEP={1:['snapshot','ordered'],2:['names','classes','thresholds','bounds','order','total'],3:['tracks','counts'],4:['order','depth_by_track','base_by_track'],5:['reading','series'],6:['snapshot','totals','kinds','cells','dimensions','states'],7:['snapshot','access_counts','layer_counts','access_order','licence_order'],8:['splits'],9:['results'],10:['assays'],11:['sem','sweep'],12:['convergence'],13:['rows','examples']}

def table(n,d):
 h=[];r=[]
 if n==1:
  h=['Kind','Records','Share','Total records'];r=[[k,v,v/d['snapshot']['records'],d['snapshot']['records']] for k,v in d['ordered']]
 elif n==2:
  h=['Threshold','Provider','Provider class','Lower','Upper','Topics'];r=[[t,d['names'][p],d['classes'][p],*d['bounds'][p][t],d['total']] for t in d['thresholds'] for p in d['order']]
 elif n==3:
  h=['Track','Core units','Research units','Practice units','Lessons'];r=[[t['id'],*[d['counts'][t['id']].get(k,0) for k in ['core','research','practice']],len(t['lessons'])] for t in d['tracks']]
 elif n==4:
  h=['Track','Worked','Executable','Assessed','Real-data basis','Authored basis'];r=[[t,*[d['depth_by_track'][t].get(k,0) for k in ['worked','executable','assessed']],*[d['base_by_track'][t].get(k,0) for k in ['real-data','authored']]] for t in d['order']]
 elif n==5:
  h=['Aggregate','Category','Self / outcome','Retained reading'];r=[['outcome',k,d['reading'][k],''] for k in ['equal','reading_deeper','reading_shallower']]+[['threshold',x['threshold'],x['recorded'],x['reading']] for x in d['reading']['thresholds']]
 elif n==6:
  h=['Kind','Dimension','Available','Applicable','Total',*d['states']];r=[[k,dim,c['available'],c['applicable'],c['total'],*[c['states'][s] for s in d['states']]] for k in d['kinds'] for dim,c in d['cells'][k].items()]
 elif n==7:
  h=['Axis','Category','Records','Share','Total records'];r=[[axis,k,counts.get(k,0),counts.get(k,0)/d['snapshot']['records'],d['snapshot']['records']] for axis,keys,counts in [('access',d['access_order'],d['access_counts']),('licence',d['licence_order'],d['layer_counts'])] for k in keys]
 elif n==8:
  h=['Metric','Model','Scaffold split · primary','Random split · contrast','Unit']
  for metric,source,unit in [('mae','point_metrics','kcal/mol'),('rmse','point_metrics','kcal/mol'),('coverage','interval_metrics','fraction'),('mean_width','interval_metrics','kcal/mol')]:
   for model in ['train_mean','morgan_ridge','morgan_random_forest']:
    r.append([metric,model,*[d['splits'][s][source].get(model,{}).get(metric,'undefined · no interval') for s in ['scaffold','random']],unit])
 elif n==9:
  h=['Metric','Model','Primary partition · n=132','Assay replication · n=170'];r=[[metric,model,*[(d['results'][p]['metrics'][model][metric] if d['results'][p]['metrics'][model][metric] is not None else 'undefined · constant prediction') for p in ['primary_test','assay_replication']]] for metric in ['mae','rmse','spearman'] for model in ['train_mean','descriptor_ridge','morgan_ridge']]
 elif n==10:
  h=['Assay','Policy','Acquired parents','Recovery fraction','Evaluation MAE · pChEMBL','Normalized recovery AUC'];r=[[assay,name,x,a['policies'][name]['recovery'][j],a['policies'][name]['evaluation_mae'][j],a['policies'][name]['normalized_auc']] for assay,a in d['assays'].items() for name in a['names'] for j,x in enumerate(a['checkpoints'])]
 elif n==11:
  h=['Section','System / blocks','Mean radius · Å','Naive SEM · Å','100-block SEM / sweep SEM · Å','Source block/naive ratio'];r=[['100-block estimate',name,s['mean_rg'],s['naive_sem'],s['block_sem'],s['ratio']] for name,s in d['sem'].items()]+[['Block sweep',s['blocks'],'','',s['sem'],''] for s in sorted(d['sweep'],key=lambda s:s['blocks'])]
 elif n==12:
  h=['Frames','Ethanol deviation · Å','Malonaldehyde deviation · Å'];r=[[s['frames'],s['ethanol'],s['malonaldehyde']] for s in d['convergence']]
 elif n==13:
  h=['Section','Pair / selected CYP molecule','Shared n / CYP2D6 pChEMBL','Pearson r / CYP3A4 pChEMBL','Spearman rho / difference'];r=[['Pairwise agreement',*s] for s in d['rows']]+[['Selected CYP extreme',name,a,b,a-b] for name,a,b in d['examples']]
 return {'headers':h,'rows':r}

def stale_projection_paths(outputs):
 return [path for path,value in outputs.items() if not path.is_file() or path.read_bytes()!=value]

def main():
 manifest=json.loads((ROOT/'site/src/data/atlas-figures.json').read_text());records=[];library_by_id={entry['id']:entry for entry in manifest['library']}
 for entry in manifest['library']:
  if not entry['source_stem'].startswith('plot_'):continue
  n=int(entry['source_stem'].split('_')[1]);d=load_plot_data(n);key=f'P{n}'
  out={k:d[k] for k in KEEP[n]};out.update(id=entry['id'],key=key,reportNumber=entry['reportNumber'],source=d['source'],table=table(n,d))
  if n==2:out.update(providers=d['payload']['providers'],summaries=d['payload']['summaries'])
  if n==3:out['tracks']=[{k:t[k] for k in ['id','order','title','title_zh']}|{'lessonCount':len(t['lessons'])} for t in d['tracks']]
  if n==5:out['reading']={k:d['reading'][k] for k in ['equal','reading_deeper','reading_shallower','thresholds']}
  records.append(out)
 native=json.loads(subprocess.check_output(['node',str(ROOT/'report/figures/build_schematic_masters.mjs'),'--source-record'],cwd=ROOT,text=True))
 for config in native['configs']:
  key=config['key'];out={'id':config['stem'],'key':key,'reportNumber':library_by_id[config['stem']]['reportNumber'],'native':config,'source':{'paths':['report/figures/build_schematic_masters.mjs'],'kind':'source-bound conceptual diagram','new_experiment':False}}
  fields={'S1':['artifacts'],'S2':['statementClasses'],'S3':['stages'],'S4':['stages'],'S5':['prerequisiteLessons','routes'],'S6':['resources','dimensions','dimensionKeys','dimensionNames'],'S7':['lifecycle']}[key]
  for field in fields:
   if field in native:out[field]=native[field]
  texts=config['native_contract']['native_texts'];out['objects']=[{'id':k,'label':v.replace('\n',' ')} for k,v in texts.items() if k!='master-title'];out['relations']=config['native_contract']['native_connectors']+config['native_contract']['relation_marks']
  out['table']={'headers':['Object / relation','Source label / relation identity'],'rows':[[x['id'],x['label']] for x in out['objects']]+[['relation',s] for s in out['relations']]}
  if key in ['S3','S4']:
   out['table']['rows'].extend([[f'Stage {i+1} · {field}',('; '.join(value) if isinstance(value,list) else value)] for i,stage in enumerate(native['stages']) for field,value in stage.items() if field in ['name','decision','fields','baseline','failure']])
  if key=='S5':
   out['table']['rows'].extend([[f'Route · {route["id"]}',f'{route["count"]} lessons; prerequisites: '+('; '.join(route['prerequisites']) or 'none')] for route in native['routes']])
  if key=='S6':
   out['table']['rows'].extend([[f'{record["id"]} · {dim["name"]}',dim['value']+'; '+('; '.join(e.get('url',e.get('title','')) for e in dim['evidence']) or 'unverified')] for record in native['resources'] for dim in record.get('dimensions',[])])
  records.append(out)
 records.sort(key=lambda r:r['reportNumber'])
 outputs={ROOT/'site/src/data/figure-details.json':(json.dumps(records,ensure_ascii=False,indent=2)+'\n').encode('utf-8')}
 dest=ROOT/'site/public/data/figures'
 for record in records:
  stream=io.StringIO(newline='');writer=csv.writer(stream,lineterminator='\r\n');writer.writerow(record['table']['headers']);writer.writerows(record['table']['rows']);outputs[dest/f'{record["id"]}.csv']=stream.getvalue().encode('utf-8-sig')
 if '--check' in sys.argv:
  stale=[str(path.relative_to(ROOT)) for path in stale_projection_paths(outputs)]
  if stale:raise SystemExit('Stale source projection: '+', '.join(stale)+'; run site/scripts/export-figure-details.py')
  print(f'Checked {len(records)} source projections and exact CSVs')
 else:
  for path,value in outputs.items():path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(value)
  print(f'Projected {len(records)} figure detail records and exact source tables/CSVs')
if __name__=='__main__':main()
