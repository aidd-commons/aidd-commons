# Student modelling sandbox

An original, deliberately synthetic exercise for learning how fitting,
validation and error analysis connect. The ten entities and both targets are
invented. They are not chemical structures, assay measurements, or QSAR evidence.
The continuous response and binary `hit` are separate constructed targets;
neither is derived from an existing ChEMBL endpoint.

## Before you run

- Mode: editable student exercise, not an author's frozen reproduction.
- Python: 3.11 or 3.12, standard library only. No package installation needed.
- Platform: secure report writing uses POSIX `O_DIRECTORY` and `O_NOFOLLOW` on
  macOS or Linux. On another platform, use the browser reference output instead;
  the runner refuses to write a report.
- Resources: CPU only; ten rows, normally under one second; output under 0.01 MB.
- Network/data: no download, credentials, real assay data or GPU.
- CLI output: a fresh file inside `tmp/student-modelling/` in this checkout.
  Existing files and symlink output paths are rejected. Pick another filename
  for another run; no automatic overwrite or deletion is performed.

## Uploadable notebooks

- [English notebook](student_modelling_tutorial.ipynb)
- [中文 notebook](student_modelling_tutorial.zh-CN.ipynb)

Download one notebook and use **File → Upload notebook** in
[Google Colab](https://colab.research.google.com/). It requires only the Python
standard library and the bundled Jupyter display helper: no installation, network
request, GPU, API key, or Drive mount. Run it top to bottom. It writes its JSON
report and the fitted-model SVG to a fresh directory beneath its current working
directory. It does not replace previous reports or author result files.

The notebooks embed the tested pure functions and visibly unfold the canonical
split/fit/select/score body rather than calling a repository helper. Rebuild both
clean notebook files after an intentional teaching-function change with:

```sh
.venv/bin/python labs/student_modelling/build_notebooks.py
```

From the repository root:

```sh
python3 --version
python3 labs/student_modelling/run_lab.py
```

If the project's environment already exists, `.venv/bin/python` is another
interpreter choice. This lab does not require `uv sync` or site dependencies.
For another run:

```sh
python3 labs/student_modelling/run_lab.py --output tmp/student-modelling/attempt-02.json
```

Open the JSON in a text editor. It includes the selected settings, all candidate
training parameters, validation scores, test predictions/residuals and cheap
baseline scores. The script never imports the existing FreeSolv, ChEMBL,
rMD17 or pool-budget implementations.

## Protocol that you can follow through the code

`teaching_rows()` declares six training, two validation and two test entities.
All IDs are distinct. The feature is a synthetic scalar, not a descriptor
computed from a molecule. Training responses lie on `response = 1 + 2 * feature`.
The last two responses deliberately do not follow that line.

For regression, `fit_ridge` minimizes the **sum** of squared residuals plus
`alpha * slope²`, with an unpenalized intercept. Candidates use alpha 0, 1, 10.
Select by validation MAE; break exact ties with the smaller alpha. Compare the
selected predictor against the training-response mean.

For classification, standardize the feature with the **training** mean and
population standard deviation. `fit_logistic` takes 500 full-batch gradient
steps at learning rate 0.1, minimizing **mean** binary cross-entropy plus
`alpha * slope² / 2`. Alpha 0, 1, 10 are candidates; these do not have the same
numerical meaning as the regression penalties or scikit-learn's inverse `C`.
Choose by validation log loss. The decision threshold stays 0.5, with equality
classified as positive. Compare against the training prevalence, including log
loss, not only thresholded accuracy. Probabilities are clipped to
`[1e-15, 1 - 1e-15]` for scoring only. Undefined precision/recall is JSON `null`.

No final refit adds validation rows to training. Training on separable labels
with alpha 0 does not give a finite unregularized maximum-likelihood optimum;
500 steps define an instructional iterate, not a convergence guarantee or a
calibrated probability model. The test set contains extrapolation and an
explicitly contradictory target. This constructed failure teaches interpretation.

## Reference output, actually run on 2026-09-09

Python 3.11.15 produced these values from the unmodified script:

| Quantity                            | Observed synthetic output              |
| ----------------------------------- | -------------------------------------- |
| Both selected alphas                | 0                                      |
| Regression intercept, slope         | 1, 2                                   |
| Regression validation MAE           | 0                                      |
| Regression test predictions         | 13, 15                                 |
| Recorded test responses             | 10, 9                                  |
| Regression test MAE / RMSE          | 4.5 / 4.743416490252569                |
| Training-mean test MAE              | 3.5                                    |
| Logistic test accuracy              | 0.5                                    |
| Logistic / prevalence test log loss | 5.359325802153142 / 0.6931471805599453 |

Floating-point tails may vary by interpreter. The worse-than-constant results
are intentional consequences of these authored examples, not an empirical
finding about molecular prediction. There are only two test records and no
confidence interval or generalization claim.

## Your independent exercise

Before changing anything, predict what each change can affect. In your own
student checkout, edit the records inside `teaching_rows()` and use a new output
filename. Do not edit existing real-data lab protocols or result directories.

1. Add 100 to test responses. Which training parameters and selected alphas
   must remain unchanged? Which residuals and scores can change?
2. Replace both validation responses with 6. Which candidate parameters remain
   unchanged, and which regression alpha should be selected now?
3. Give the final entity the same ID as the first. Should fitting proceed?
4. Explain why the logistic and constant predictors have the same accuracy but
   very different log loss. Is higher confidence always better?

Answers: (1) candidates, selection and predictions stay fixed; regression
residuals/scores change. (2) fitted candidates stay fixed; alpha 10 is selected
because its predictions are closest to 6. (3) the input check rejects the duplicate
before fitting. (4) both classify both records as positive at threshold 0.5;
the learned model is highly confident on the negative record, so log loss is worse.
These mutations are debugging exercises, not permission to tune a research test.

Read the bilingual website lesson at
`/learn/machine-learning/student-modelling-sandbox/` for the wider learning route.

## Real-data inductive-bias, sampling-uncertainty, and imbalanced-classification benchmark (`real-benchmark`)

To extend the synthetic sandbox with an executable real-data evaluation across:
- **`t03-inductive-bias-selection`**: comparing `tabular_descriptor_ridge`, 2-layer atom-permutation-invariant `graph_mpnn_ridge`, `sequence_kmer_attention_ridge`, and `multimodal_graph_sequence_ridge` across `30` real ChEMBL 37 human EGFR (`CHEMBL203`) ligand-pocket complex measurements (`18` train, `6` validation, `6` test) spanning wild-type (`1M17`, `4HJO`), `T790M` (`3POZ`), and `T790M/C797S` (`1XKK`-derived mutant state),
- **`t03-computational-uncertainty`**: comparing optimizer starting-point/budget variability (`50`, `200`, `500` gradient steps across `3` initializations) against `40` stratified finite-data bootstrap resamples of `24` real ChEMBL 37 EGFR training compounds (`5` positives, `19` negatives),
- **`t07-classification-formulation`**: comparing `unweighted_logistic`, inverse-prevalence `class_weighted_logistic` (`pos_weight = 3.8`), and `minority_oversampled_logistic` (`20` oversampled positives vs `19` negatives) across `40` real ChEMBL 37 EGFR compounds (`24` train, `8` validation, `8` test at `20.83%` minority positive prevalence):

```sh
.venv/bin/python labs/student_modelling/run_lab.py real-benchmark
.venv/bin/python labs/student_modelling/run_lab.py check-real-benchmark
```

Observed real-data summary (verified 2026-11-07):
- Atom-renumbering invariance check on `erlotinib`: `graph_permutation_invariance_max_diff = 0.0`.
- Inductive-bias family selection (`validation_mae` / `test_mae` / `test_rmse` in `pIC50`): `tabular_descriptor_ridge` (`1.4691` / `1.1589` / `1.4025`), `graph_mpnn_ridge` (`1.3914` / `1.1980` / `1.4260`), `sequence_kmer_attention_ridge` (`0.6616` / `0.6193` / `0.7214`), and `multimodal_graph_sequence_ridge` (`0.3947` / `0.3861` / `0.4123`, selected by validation MAE).
- Optimizer vs sampling uncertainty: optimizer spread across `3` starting points shrinks from `0.3064` (`50` steps, `1200` gradient evaluations) to `0.0239` (`200` steps, `4800` gradient evaluations) and `0.0003` (`500` steps, `12000` gradient evaluations), whereas `40` bootstrap resamples of the `24` training compounds produce `mean_test_90pct_interval_width = 0.3836`, `max_test_90pct_interval_width = 0.4684`, and `7` of `8` test compounds flipping binary classification decision (`p >= 0.5`).
- Imbalanced binary classification (`test` split): `unweighted_logistic` achieves `recall = 0.0` (`balanced_accuracy = 0.5`, `mean_predicted_probability = 0.2492`, `log_loss = 0.4723`), whereas `class_weighted_logistic` (`pos_weight = 3.8`) and `minority_oversampled_logistic` restore `recall = 1.0` and `balanced_accuracy = 0.75` while shifting `mean_predicted_probability` to `0.4779` and `0.4901` (`log_loss = 0.5903` and `0.6040`).

Original software: Apache-2.0. Original prose and invented teaching data: CC BY 4.0.
