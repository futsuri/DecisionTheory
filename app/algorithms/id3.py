"""ID3 decision tree for categorical data."""

from collections import Counter
from math import floor, log2


def build_tree(payload):
    features, target, rows = _parse_payload(payload)
    records = [_row_to_record(features, target, row) for row in rows]
    domains = {
        feature: sorted({record[feature] for record in records})
        for feature in features
    }
    steps = []
    tree = _id3(records, features, target, domains, steps, [])
    return {
        "tree": tree,
        "steps": steps,
        "stats": {
            "task_title": str(payload.get("task_title") or ""),
            "objects_count": len(records),
            "features_count": len(features),
            "classes": sorted(Counter(record[target] for record in records)),
            "class_distribution": dict(Counter(record[target] for record in records)),
            "root_entropy": _round(_entropy(records, target), 3),
            "root_feature": tree.get("feature") if tree.get("type") == "node" else None,
            "root_gains": steps[0]["gains"] if steps else [],
        },
    }


def classify_object(payload):
    tree = payload.get("tree")
    obj = payload.get("object") or {}
    if not isinstance(tree, dict):
        raise ValueError("ID3: tree must be an object")
    if not isinstance(obj, dict):
        raise ValueError("ID3: object must be an object")

    node = tree
    path = []
    while node.get("type") == "node":
        feature = node["feature"]
        value = str(obj.get(feature, "")).strip()
        children = node.get("children") or {}
        if value in children:
            path.append({"feature": feature, "value": value})
            node = children[value]
        else:
            result = node.get("majority_class")
            path.append({
                "feature": feature,
                "value": value or "—",
                "fallback": True,
                "warning": "Значение не встречалось в обучающей выборке для этого узла",
                "class": result,
            })
            return {"class": result, "path": path}

    result = node.get("class")
    path.append({"class": result})
    return {"class": result, "path": path}


def _parse_payload(payload):
    features = [str(item).strip() for item in (payload.get("features") or [])]
    target = str(payload.get("target") or "").strip()
    rows = payload.get("data") or []

    if not (2 <= len(features) <= 7):
        raise ValueError("ID3: количество признаков должно быть от 2 до 7")
    if any(not item for item in features) or len(set(features)) != len(features):
        raise ValueError("ID3: признаки должны быть непустыми и уникальными")
    if not target or target in features:
        raise ValueError("ID3: целевой класс должен быть указан отдельно от признаков")
    if not isinstance(rows, list) or not (5 <= len(rows) <= 50):
        raise ValueError("ID3: количество объектов должно быть от 5 до 50")

    width = len(features) + 1
    cleaned = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, list) or len(row) != width:
            raise ValueError(f"ID3: строка {index} должна содержать {width} значений")
        values = [str(value).strip() for value in row]
        if any(not value for value in values):
            raise ValueError(f"ID3: строка {index} содержит пустые значения")
        cleaned.append(values)
    return features, target, cleaned


def _row_to_record(features, target, row):
    record = {feature: row[index] for index, feature in enumerate(features)}
    record[target] = row[-1]
    return record


def _id3(records, features, target, domains, steps, path):
    distribution = dict(Counter(record[target] for record in records))
    majority = _majority_class(records, target)
    entropy = _entropy(records, target)

    if len(distribution) == 1:
        return _leaf(next(iter(distribution)), records, distribution, path)
    if not features:
        return _leaf(majority, records, distribution, path)

    gains = [{"feature": feature, "gain": _round(_information_gain(records, feature, target), 3)} for feature in features]
    best = max(gains, key=lambda item: item["gain"])
    steps.append({
        "path": path[:],
        "samples": len(records),
        "entropy": _round(entropy, 3),
        "distribution": distribution,
        "gains": gains,
        "selected_feature": best["feature"],
    })

    remaining = [feature for feature in features if feature != best["feature"]]
    children = {}
    for value in domains.get(best["feature"], sorted({record[best["feature"]] for record in records})):
        subset = [record for record in records if record[best["feature"]] == value]
        if subset:
            children[value] = _id3(subset, remaining, target, domains, steps, path + [{"feature": best["feature"], "value": value}])
        else:
            children[value] = _leaf(majority, records, distribution, path + [{"feature": best["feature"], "value": value}])

    return {
        "type": "node",
        "feature": best["feature"],
        "samples": len(records),
        "entropy": _round(entropy, 3),
        "majority_class": majority,
        "distribution": distribution,
        "children": children,
    }


def _leaf(label, records, distribution, path):
    return {
        "type": "leaf",
        "class": label,
        "samples": len(records),
        "distribution": distribution,
        "path": path[:],
    }


def _entropy(records, target):
    total = len(records)
    counts = Counter(record[target] for record in records)
    return -sum((count / total) * log2(count / total) for count in counts.values())


def _information_gain(records, feature, target):
    total = len(records)
    remainder = 0.0
    for value in {record[feature] for record in records}:
        subset = [record for record in records if record[feature] == value]
        remainder += (len(subset) / total) * _entropy(subset, target)
    return _entropy(records, target) - remainder


def _majority_class(records, target):
    counts = Counter(record[target] for record in records)
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def _round(value, precision):
    factor = 10 ** precision
    return floor(float(value) * factor) / factor
