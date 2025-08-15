export function removeElem<T>(element: T, array: T[]){
    const index = array.indexOf(element);
    if (index > -1) { // only splice array when item is found
        array.splice(index, 1); // 2nd parameter means remove one item only
    }
    return array;
}