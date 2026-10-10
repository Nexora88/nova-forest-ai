from scripts.evaluate_thrace_dataset import confusion, wilson_interval


def test_confusion_reports_error_counts_and_uncertainty():
    result = confusion([1, 1, 0, 0], [1, 0, 0, 1])
    assert result["confusion_matrix"] == {"tn": 1, "fp": 1, "fn": 1, "tp": 1}
    assert result["recall_sensitivity"] == 0.5
    assert result["specificity"] == 0.5
    assert result["accuracy_wilson_95_ci"] is not None
    assert result["n"] == 4


def test_wilson_interval_is_unavailable_for_zero_denominator():
    assert wilson_interval(0, 0) is None
