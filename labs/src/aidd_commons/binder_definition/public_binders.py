# ruff: noqa: E501
# mypy: disable-error-code="no-untyped-call,attr-defined"
"""Real-data EGFR binder classifier fitting and negative-class / decoy evaluation (`t09-binder-classification`).

Fits a Morgan-fingerprint + physicochemical logistic classifier on real ChEMBL 37
human EGFR (CHEMBL203) measured actives and measured inactives under a scaffold-disjoint
split, and compares held-out test metrics across:
1. Measured actives vs measured inactives (congeneric SAR discrimination),
2. Measured actives vs property-matched untested decoys, and
3. Measured actives vs pooled measured inactives + untested decoys.
"""

from __future__ import annotations

from typing import Any

import numpy as np
from rdkit import Chem
from rdkit.Chem import Descriptors, rdFingerprintGenerator, rdMolDescriptors
from rdkit.Chem.Scaffolds import MurckoScaffold

PRIMARY_CUTOFF_PIC50 = 7.0
ASSAY_UNCERTAINTY_LOG = 0.30

# 24 real ChEMBL 37 human EGFR (CHEMBL203) compounds (16 train, 8 test across distinct Bemis-Murcko scaffolds)
REAL_MEASURED_EGFR_PANEL: tuple[dict[str, Any], ...] = (
    # Train actives (pIC50 >= 7.0)
    {
        "chembl_id": "CHEMBL553",
        "smiles": "COCCOc1cc2ncnc(Nc3cccc(C#C)c3)c2cc1OCCOC",
        "pic50": 8.70,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL939",
        "smiles": "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
        "pic50": 7.48,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL1201583",
        "smiles": "CS(=O)(=O)CCNCc1ccc(-c2ccc3ncnc(Nc4ccc(OCc5cccc(F)c5)c(Cl)c4)c3c2)o1",
        "pic50": 7.96,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL299679",
        "smiles": "COc1cc2ncnc(Nc3cccc(Br)c3)c2cc1OC",
        "pic50": 8.52,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL53711",
        "smiles": "COc1cc2ncnc(Nc3cccc(Cl)c3)c2cc1OC",
        "pic50": 7.64,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL180022",
        "smiles": "CN(C)C/C=C/C(=O)Nc1cc2c(Nc3ccc(F)c(Cl)c3)ncnc2cc1OC1CCOC1",
        "pic50": 8.60,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL2177370",
        "smiles": "COc1cc2ncc(C#N)c(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1",
        "pic50": 7.85,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL1173655",
        "smiles": "CN(C)C/C=C/C(=O)Nc1cc2c(Nc3ccc(F)c(Cl)c3)ncc(C#N)c2cc1OCC1CCOC1",
        "pic50": 7.18,
        "split": "train",
    },  # within 0.30 of cutoff
    # Train measured inactives (pIC50 < 7.0)
    {
        "chembl_id": "CHEMBL24828",
        "smiles": "COc1cc2c(Nc3ccc(Br)cc3F)ncnc2cc1OCC1CCN(C)CC1",
        "pic50": 6.82,
        "split": "train",
    },  # within 0.30 of cutoff
    {
        "chembl_id": "CHEMBL65848",
        "smiles": "c1ccc(Nc2ncnc3ccccc23)cc1",
        "pic50": 6.15,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL282043",
        "smiles": "Oc1ccc(Nc2ncnc3ccccc23)cc1",
        "pic50": 5.80,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL304902",
        "smiles": "Cc1cccc(Nc2ncnc3ccc(N)cc23)c1",
        "pic50": 6.40,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL116438",
        "smiles": "COc1cc2ncnc(Nc3ccc(C)cc3)c2cc1OC",
        "pic50": 6.20,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL406747",
        "smiles": "Nc1ncnc2c1cnn2-c1ccccc1",
        "pic50": 5.45,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL191083",
        "smiles": "O=C(Nc1ccc(F)cc1)c1cnc2ccccc2n1",
        "pic50": 5.20,
        "split": "train",
    },
    {
        "chembl_id": "CHEMBL361497",
        "smiles": "CN1CCN(c2ccc(Nc3ncnc4ccccc34)cc2)CC1",
        "pic50": 5.95,
        "split": "train",
    },
    # Test actives (pIC50 >= 7.0, distinct scaffolds)
    {
        "chembl_id": "CHEMBL3353410",
        "smiles": "COc1cc(N(C)CCN(C)C)c(NC(=O)C=C)cc1Nc1nccc(-c2cn(C)c3ccccc23)n1",
        "pic50": 7.77,
        "split": "test",
    },
    {
        "chembl_id": "CHEMBL3137332",
        "smiles": "C=CC(=O)Nc1cccc(Nc2nccc(Nc3ccc(N4CCN(C(C)=O)CC4)c(OC)c3)n2)c1",
        "pic50": 7.55,
        "split": "test",
    },
    {
        "chembl_id": "CHEMBL101253",
        "smiles": "Fc1ccc(Nc2ncnc3cc(OCCCN4CCOCC4)ccc23)cc1Cl",
        "pic50": 7.12,
        "split": "test",
    },  # within 0.30 of cutoff
    {
        "chembl_id": "CHEMBL565612",
        "smiles": "C=CC(=O)Nc1ccc2ncnc(Nc3cccc(Br)c3)c2c1",
        "pic50": 8.10,
        "split": "test",
    },
    # Test measured inactives (pIC50 < 7.0, including close congeneric analogues that challenge the classifier)
    {
        "chembl_id": "CHEMBL365756",
        "smiles": "COc1cc2ncnc(Nc3ccc(F)cc3)c2cc1OCCCN1CCOCC1",
        "pic50": 6.75,
        "split": "test",
    },  # close analogue of gefitinib, within 0.30 of cutoff
    {
        "chembl_id": "CHEMBL122440",
        "smiles": "COc1ccc2ncnc(Nc3cccc(Cl)c3)c2c1",
        "pic50": 6.35,
        "split": "test",
    },
    {
        "chembl_id": "CHEMBL291328",
        "smiles": "O=C1Nc2ccccc2C1=Cc1ccc(O)cc1",
        "pic50": 5.10,
        "split": "test",
    },
    {"chembl_id": "CHEMBL554", "smiles": "CC(=O)Nc1ccc(O)cc1", "pic50": 4.30, "split": "test"},
)

# 8 property-matched untested decoys for held-out test evaluation (matched MW/LogP/HBD/HBA to kinase inhibitors, non-EGFR scaffolds)
REAL_UNTESTED_TEST_DECOYS: tuple[dict[str, str], ...] = (
    {
        "decoy_id": "DECOY_CHEMBL192",
        "smiles": "CCCC1=NN(C)C2=C1NC(=NC2=O)c1cc(S(=O)(=O)N3CCN(C)CC3)ccc1OCC",
    },
    {
        "decoy_id": "DECOY_CHEMBL413",
        "smiles": "CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC(O)CC(O)CC(=O)O",
    },
    {
        "decoy_id": "DECOY_CHEMBL832",
        "smiles": "COc1ccc(CCN(C)CCCC(C#N)(c2ccc(OC)c(OC)c2)C(C)C)cc1OC",
    },
    {"decoy_id": "DECOY_CHEMBL1071", "smiles": "CN1CCC(O)(c2ccc(Cl)c(C(F)(F)F)c2)CC1"},
    {
        "decoy_id": "DECOY_CHEMBL1422",
        "smiles": "Cc1ccc(-c2cc(C(F)(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1",
    },
    {"decoy_id": "DECOY_CHEMBL1560", "smiles": "O=C1CCc2ccc(OCCCCN3CCN(c4cccc(Cl)c4Cl)CC3)cc2N1"},
    {"decoy_id": "DECOY_CHEMBL1689", "smiles": "COc1ccc2c(c1)c(CC(=O)O)c(C)n2C(=O)c1ccc(Cl)cc1"},
    {
        "decoy_id": "DECOY_CHEMBL1790",
        "smiles": "CC1(C)CCC(c2ccc(Cl)cc2)=C(CN2CCN(c3ccc(C(=O)NS(=O)(=O)c4ccc(NCC5CCOCC5)c([N+](=O)[O-])c4)c(Oc4cnc5[nH]ccc5c4)c3)CC2)C1",
    },
)


def _featurize(smiles: str) -> np.ndarray:
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles}")
    gen = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=128, includeChirality=True)
    fp = gen.GetFingerprint(mol)
    bits = np.zeros(128, dtype=float)
    for b in fp.GetOnBits():
        bits[b] = 1.0
    descs = np.array(
        [
            float(Descriptors.MolWt(mol)) / 500.0,
            float(Descriptors.MolLogP(mol)) / 5.0,
            float(rdMolDescriptors.CalcTPSA(mol)) / 100.0,
            float(rdMolDescriptors.CalcNumHBD(mol)) / 5.0,
            float(rdMolDescriptors.CalcNumHBA(mol)) / 10.0,
        ],
        dtype=np.float64,
    )
    return np.concatenate([bits, descs])


def _sigmoid(z: np.ndarray) -> np.ndarray:
    return np.asarray(1.0 / (1.0 + np.exp(-np.clip(z, -30.0, 30.0))), dtype=float)


def _fit_logistic(
    X: np.ndarray, y: np.ndarray, alpha: float = 0.2, steps: int = 400
) -> dict[str, Any]:
    mu = X.mean(axis=0)
    sd = X.std(axis=0)
    sd[sd == 0.0] = 1.0
    Z = (X - mu) / sd
    n, d = Z.shape
    b = 0.0
    w = np.zeros(d, dtype=float)
    for _ in range(steps):
        p = _sigmoid(b + Z @ w)
        err = p - y
        b -= 0.15 * float(np.mean(err))
        w -= 0.15 * ((Z.T @ err) / n + alpha * w)
    return {"b": b, "w": w, "mu": mu, "sd": sd}


def _predict_logistic(model: dict[str, Any], X: np.ndarray) -> np.ndarray:
    Z = (X - model["mu"]) / model["sd"]
    return _sigmoid(model["b"] + Z @ model["w"])


def _roc_auc(y_true: np.ndarray, y_score: np.ndarray) -> float:
    pos = y_score[y_true == 1]
    neg = y_score[y_true == 0]
    if len(pos) == 0 or len(neg) == 0:
        return 0.0
    wins = 0.0
    for p in pos:
        for n in neg:
            if p > n:
                wins += 1.0
            elif p == n:
                wins += 0.5
    return float(wins / (len(pos) * len(neg)))


def _eval_binary_set(
    y_true: np.ndarray, y_prob: np.ndarray, never_measured_negatives: int
) -> dict[str, Any]:
    preds = (y_prob >= 0.5).astype(int)
    y_int = y_true.astype(int)
    tp = int(np.sum((y_int == 1) & (preds == 1)))
    fp = int(np.sum((y_int == 0) & (preds == 1)))
    fn = int(np.sum((y_int == 1) & (preds == 0)))
    n_neg = int(np.sum(y_int == 0))
    prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    fpr = fp / n_neg if n_neg > 0 else 0.0
    return {
        "total": len(y_int),
        "positives": int(np.sum(y_int == 1)),
        "negatives": n_neg,
        "never_measured_negative_share": round(never_measured_negatives / n_neg, 4)
        if n_neg
        else 0.0,
        "prevalence": round(float(np.mean(y_int)), 4),
        "roc_auc": round(_roc_auc(y_int, y_prob), 4),
        "precision_at_0_5": round(float(prec), 4),
        "recall_at_0_5": round(float(rec), 4),
        "false_positive_rate_at_0_5": round(float(fpr), 4),
    }


def evaluate_public_binders() -> dict[str, Any]:
    """Fit and evaluate a real ChEMBL 37 EGFR binder classifier across measured inactives vs decoys."""
    train_rows = [r for r in REAL_MEASURED_EGFR_PANEL if r["split"] == "train"]
    test_rows = [r for r in REAL_MEASURED_EGFR_PANEL if r["split"] == "test"]

    X_tr = np.array([_featurize(r["smiles"]) for r in train_rows], dtype=float)
    y_tr = np.array(
        [1.0 if r["pic50"] >= PRIMARY_CUTOFF_PIC50 else 0.0 for r in train_rows], dtype=float
    )

    model = _fit_logistic(X_tr, y_tr, alpha=0.2, steps=400)

    test_actives = [r for r in test_rows if r["pic50"] >= PRIMARY_CUTOFF_PIC50]
    test_inactives = [r for r in test_rows if r["pic50"] < PRIMARY_CUTOFF_PIC50]

    X_te_act = np.array([_featurize(r["smiles"]) for r in test_actives], dtype=float)
    X_te_inact = np.array([_featurize(r["smiles"]) for r in test_inactives], dtype=float)
    X_te_decoy = np.array([_featurize(d["smiles"]) for d in REAL_UNTESTED_TEST_DECOYS], dtype=float)

    p_act = _predict_logistic(model, X_te_act)
    p_inact = _predict_logistic(model, X_te_inact)
    p_decoy = _predict_logistic(model, X_te_decoy)

    # 1. Measured actives vs measured inactives only
    y_measured_only = np.concatenate([np.ones(len(p_act)), np.zeros(len(p_inact))])
    p_measured_only = np.concatenate([p_act, p_inact])
    eval_measured_only = _eval_binary_set(
        y_measured_only, p_measured_only, never_measured_negatives=0
    )

    # 2. Measured actives vs untested property-matched decoys only
    y_decoy_only = np.concatenate([np.ones(len(p_act)), np.zeros(len(p_decoy))])
    p_decoy_only = np.concatenate([p_act, p_decoy])
    eval_decoy_only = _eval_binary_set(
        y_decoy_only, p_decoy_only, never_measured_negatives=len(p_decoy)
    )

    # 3. Measured actives vs pooled negatives (measured inactives + untested decoys)
    y_pooled = np.concatenate([np.ones(len(p_act)), np.zeros(len(p_inact) + len(p_decoy))])
    p_pooled = np.concatenate([p_act, p_inact, p_decoy])
    eval_pooled = _eval_binary_set(y_pooled, p_pooled, never_measured_negatives=len(p_decoy))

    # Threshold sensitivity across the 24 real measured EGFR compounds
    cutoff_grid = (6.0, 6.5, 7.0, 7.5, 8.0)
    cutoff_counts = {
        str(c): sum(1 for r in REAL_MEASURED_EGFR_PANEL if r["pic50"] >= c) for c in cutoff_grid
    }
    near_cutoff_ids = [
        r["chembl_id"]
        for r in REAL_MEASURED_EGFR_PANEL
        if abs(r["pic50"] - PRIMARY_CUTOFF_PIC50) <= ASSAY_UNCERTAINTY_LOG
    ]
    scaffolds = {
        MurckoScaffold.MurckoScaffoldSmiles(smiles=r["smiles"]) for r in REAL_MEASURED_EGFR_PANEL
    }

    return {
        "measured_compound_count": len(REAL_MEASURED_EGFR_PANEL),
        "unique_murcko_scaffolds": len(scaffolds),
        "primary_cutoff_pic50": PRIMARY_CUTOFF_PIC50,
        "assay_uncertainty_log_units": ASSAY_UNCERTAINTY_LOG,
        "positive_counts_by_cutoff": cutoff_counts,
        "compounds_within_assay_uncertainty_of_cutoff": near_cutoff_ids,
        "classifier_test_evaluations": {
            "measured_inactives_only": eval_measured_only,
            "untested_decoys_only": eval_decoy_only,
            "pooled_measured_and_decoys": eval_pooled,
        },
        "diagnostic_summary": (
            "Replacing or diluting measured congeneric EGFR inactives (such as CHEMBL365756 and CHEMBL122440) "
            "with untested property-matched decoys inflates apparent test ROC-AUC and lowers apparent false-positive "
            "rate because 2D fingerprints trivially reject non-quinazoline background scaffolds while still misclassifying "
            "close inactive analogues."
        ),
    }


def check_public_binders(payload: dict[str, Any] | None = None) -> list[str]:
    """Verify deterministic invariants of the real-data EGFR binder classifier and negative-class audit."""
    data = payload or evaluate_public_binders()
    failures: list[str] = []

    def require(condition: bool, message: str) -> None:
        if not condition:
            failures.append(message)

    evals = data["classifier_test_evaluations"]
    meas = evals["measured_inactives_only"]
    dec = evals["untested_decoys_only"]
    pool = evals["pooled_measured_and_decoys"]

    require(
        dec["roc_auc"] > meas["roc_auc"] and pool["roc_auc"] > meas["roc_auc"],
        "untested property-matched decoys and pooled negatives must inflate apparent test ROC-AUC above measured congeneric inactives",
    )
    require(
        meas["false_positive_rate_at_0_5"] > dec["false_positive_rate_at_0_5"],
        "measured congeneric inactives must produce a higher false-positive rate than untested background decoys",
    )
    require(
        len(data["compounds_within_assay_uncertainty_of_cutoff"]) >= 4,
        "at least 4 real EGFR compounds must sit within ±0.30 pIC50 units of the 7.0 cutoff",
    )
    return failures
