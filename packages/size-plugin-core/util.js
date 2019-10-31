function noop(a) {
    return a;
}
exports.noop = noop;
function toMap(names, values) {
    return names.reduce((map, name, i) => {
        map[name] = values[i];
        return map;
    }, {});
}
exports.toMap = toMap;
function dedupe(item, index, arr) {
    return arr.indexOf(item) === index;
}
exports.dedupe = dedupe;
function toFileMap(files) {
    return files.reduce((result, file) => {
        if (file.size) {
            // excluding files with size 0
            result[file.filename] = file.size;
        }
        return result;
    }, {});
}
exports.toFileMap = toFileMap;
