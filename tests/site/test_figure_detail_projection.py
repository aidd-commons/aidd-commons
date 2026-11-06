"""Check source/table/CSV equality independently of the chart presentation."""
import csv
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
sys.dont_write_bytecode=True
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'report/figures'))
from plot_data import load_plot_data
SPEC=importlib.util.spec_from_file_location('figure_export',ROOT/'site/scripts/export-figure-details.py')
MODULE=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(MODULE)
class FigureProjectionTest(unittest.TestCase):
 def test_every_csv_is_exactly_the_generated_source_table(self):
  records=json.loads((ROOT/'site/src/data/figure-details.json').read_text())
  for record in records:
   with self.subTest(figure=record['id']):
    rows=list(csv.reader(io.StringIO((ROOT/f'site/public/data/figures/{record["id"]}.csv').read_text(encoding='utf-8-sig'))))
    self.assertEqual(rows,[record['table']['headers']]+[[str(v) for v in row] for row in record['table']['rows']])
 def test_all_numeric_projection_tables_come_from_the_shared_loader(self):
  records=json.loads((ROOT/'site/src/data/figure-details.json').read_text())
  for n in range(1,14):
   with self.subTest(plot=n):
    record=next(r for r in records if r['key']==f'P{n}')
    self.assertEqual(record['table'],MODULE.table(n,load_plot_data(n)))
 def test_check_accepts_current_bytes_and_rejects_a_missing_policy_row(self):
  record=next(r for r in json.loads((ROOT/'site/src/data/figure-details.json').read_text()) if r['key']=='P10')
  with tempfile.TemporaryDirectory(prefix='aidd-figure-projection-') as directory:
   path=Path(directory)/'policies.csv';stream=io.StringIO(newline='');writer=csv.writer(stream);writer.writerow(record['table']['headers']);writer.writerows(record['table']['rows']);expected=stream.getvalue().encode();path.write_bytes(expected)
   self.assertEqual(MODULE.stale_projection_paths({path:expected}),[])
   path.write_bytes(expected.rsplit(b'\r\n',2)[0]+b'\r\n')
   self.assertEqual(MODULE.stale_projection_paths({path:expected}),[path])
 def test_schematic_contracts_retain_every_required_field_and_state_evidence(self):
  records=json.loads((ROOT/'site/src/data/figure-details.json').read_text())
  for key in ['S3','S4']:
   record=next(r for r in records if r['key']==key)
   for i,stage in enumerate(record['stages']):
    self.assertIn([f'Stage {i+1} · fields','; '.join(stage['fields'])],record['table']['rows'])
  source=next(r for r in records if r['key']=='S6')
  self.assertEqual([len(r['dimensions']) for r in source['resources']],[7,7])
if __name__=='__main__':unittest.main()
