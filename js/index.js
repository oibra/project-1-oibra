'use strict';
const MAX_LENGTH = 100;
const eqTrue = /(.*)==( *)true(.*)/g;
const eqFalse = /(.*)==( *)false(.*)/g;
const scan = /(.*)new Scanner\(System\.in\)(.)*/g;

let emptyStruct = false;
let scanners = 0;
let inClass = false;

let lineErrors = [{}];
let tabSize;

window.onload = () => {
    
    assignCollapseButtonToggling();

    document.getElementById('splash-link').addEventListener('click', () => {
        document.querySelector('body').classList.remove('bg-white');
        document.querySelector('body').classList.add('bg-primary');
    });

    document.getElementById('main-link').addEventListener('click', () => {
        document.querySelector('body').classList.add('bg-white');
        document.querySelector('body').classList.remove('bg-primary');
    });

    document.getElementById('file').addEventListener('click', () => {
        document.getElementById('file-group').classList.remove('d-none');
        document.getElementById('text-group').classList.add('d-none');
        
        if (document.getElementById('code-file').files) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.getElementById('text').addEventListener('click', () => {
        document.getElementById('text-group').classList.remove('d-none');
        document.getElementById('file-group').classList.add('d-none');

        if (document.getElementById('code-text').value) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.getElementById('code-file').addEventListener('input', () => {
        if (document.getElementById('code-file').files) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.getElementById('code-text').addEventListener('input', () => {
        if (document.getElementById('code-text').value) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        tabSize = document.getElementById('tab-size').value;
        let fileButton = document.getElementById('file');
        document.getElementById('errors-list').innerHTML = '';
        document.querySelector('#errors-highlighting code').innerHTML = '';
        let modals = document.querySelectorAll('.modal');
        if (modals.length > 0) {
            for (let i = 0; i < modals.length; i++){
                modals[i].remove();
            }
        }
        fetch('js/json/style.json')
                .then((response) => {
                    return response.json();
                })
                .then((json) => {
                    if (fileButton.checked) {
                        let file = document.getElementById('code-file').files[0];
                        let reader = new FileReader();
                        reader.readAsText(file, "UTF-8");
                        reader.onload = (e) => { 
                            lint(e.target.result, json);
                        }
                        reader.onerror = () => {
                            console.error("error reading file");
                        }
                    } else {
                        lint(document.getElementById('code-text').value, json);
                    }
                    
                })
                .catch((err) => {
                    console.error(err);
                })
        
        document.querySelector('h2').classList.add('collapsed');
        document.getElementById('code-form').classList.remove('collapse');
        document.getElementById('code-form').classList.add('collapsing');
        document.getElementById('code-form').classList.remove('show');
        document.getElementById('code-form').classList.add('collapse');
        document.getElementById('code-form').classList.remove('collapsing');
        document.getElementById('lint-output').classList.add('show');
        let togglers = document.querySelectorAll('h2 img');
        togglers[0].classList.remove('open');
        togglers[0].classList.add('closed');
        togglers[1].classList.remove('closed');
        togglers[1].classList.add('open');
    })
};

function lint(code, style) {
    lineErrors = [{}];
    emptyStruct = false;
    scanners = 0;
    inClass = false;
    let codeBlock = document.querySelector('#errors-highlighting code');
    let lines = code.split(/\r?\n/);
    let errorsByType = {};
    let indentLevel = 0;
    for(let l in lines) {
        let line = lines[l];  
        let lineNum = parseInt(l) + 1;
        let lLog = {
            "line": lineNum,
            "code": line,
            "errors": []
        }

        if (line.includes("}")) {
            indentLevel--;
            if (indentLevel == 0) {
                inClass = false;
            }
            if (emptyStruct) {
                lLog["errors"].push(style["empty_struct"]);
                if (!errorsByType["empty_struct"]) {
                    errorsByType["empty_struct"] = [];
                }
                errorsByType["empty_struct"].push({
                    "line": lineNum,
                    "code": line,
                    "annotation": style["empty_struct"]
                });
            }
        }   

        // check line length
        if (checkLineLength(line)) {
            lLog["errors"].push(style["long_lines"]);
            if (!errorsByType["long_lines"]) {
                errorsByType["long_lines"] = [];
            }
            errorsByType["long_lines"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["long_lines"]
            });
        }

        // check indentation
        let indentCheck = checkIndentation(line, indentLevel);
        if (indentCheck) {
            if (!errorsByType["indentation"]) {
                errorsByType["indentation"] = [];
            }
            if (indentCheck == 2) {
                lLog["errors"].push(style["indentation"]["under"]);
                errorsByType["indentation"].push({
                    "line": lineNum,
                    "code": line,
                    "annotation": style["indentation"]["under"]
                });
            } else {
                lLog["errors"].push(style["indentation"]["over"]);
                errorsByType["indentation"].push({
                    "line": lineNum,
                    "code": line,
                    "annotation": style["indentation"]["over"]
                });
            }
        }

        // check basic boolean zen
        if (checkZenTrue(line)) {
            if (!errorsByType["boolean_zen"]) {
                errorsByType["boolean_zen"] = [];
            }
            lLog["errors"].push(style["boolean_zen"]["equals_true"]);
            errorsByType["boolean_zen"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["boolean_zen"]["equals_true"]
            });
        }
        if (checkZenFalse(line)) {
            if (!errorsByType["boolean_zen"]) {
                errorsByType["boolean_zen"] = [];
            }
            lLog["errors"].push(style["boolean_zen"]["equals_false"]);
            errorsByType["boolean_zen"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["boolean_zen"]["equals_false"]
            });
        }

        // check for Scanners
        if (line.match(scan)) {
            scanners++;
        }
        if (scanners > 1) {
            if (!errorsByType["scanners"]) {
                errorsByType["scanners"] = [];
            }
            lLog["errors"].push(style["scanners"]);
            errorsByType["scanners"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["scanners"]
            });
        }

        // check constant naming conventions
        if (checkScreamingCase(line)) {
            if (!errorsByType["naming_conventions"]) {
                errorsByType["naming_conventions"] = [];
            }
            lLog["errors"].push(style["naming_conventions"]["screaming"]);
            errorsByType["naming_conventions"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["naming_conventions"]["screaming"]
            });
        }

        // check class naming conventions
        if (checkPascalCase(line)) {
            if (!errorsByType["naming_conventions"]) {
                errorsByType["naming_conventions"] = [];
            }
            lLog["errors"].push(style["naming_conventions"]["pascal"]);
            errorsByType["naming_conventions"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["naming_conventions"]["pascal"]
            })
        }

        if (checkBreak(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["break"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["break"]
            })
        }

        if (checkContinue(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["continue"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["continue"]
            })
        }

        if (checkTryCatch(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["try/catch"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["try/catch"]
            })
        }

        if (checkVar(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["var"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["var"]
            })
        }

        if (checkToArray(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["toArray"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["toArray"]
            })
        }

        if (checkStringBuilder(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["string"]["builder"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["string"]["builder"]
            })
        }

        if (checkStringBuffer(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["string"]["buffer"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["string"]["buffer"]
            })
        }

        if (checkStringJoiner(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["string"]["joiner"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["string"]["joiner"]
            })
        }

        if (checkStringTokenizer(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["string"]["tokenizer"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["string"]["tokenizer"]
            })
        }

        if (checkStringToCharArray(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["string"]["charArray"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["string"]["charArray"]
            })
        }

        if (checkStringJoin(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["string"]["join"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["string"]["join"]
            })
        }

        if (checkStringMatches(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["string"]["matches"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["string"]["matches"]
            })
        }

        if (checkArraysAsList(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["arrays"]["asList"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["arrays"]["asList"]
            })
        }

        if (checkArraysCopyOf(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["arrays"]["copyOf"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["arrays"]["copyOf"]
            })
        }

        if (checkArraysCopyOfRange(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["arrays"]["copyOfRange"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["arrays"]["copyOfRange"]
            })
        }

        if (checkArraysSort(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["arrays"]["asList"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["arrays"]["asList"]
            })
        }

        if (checkCollectionsCopy(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["collections"]["copy"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["collections"]["copy"]
            })
        }

        if (checkCollectionsSort(line)) {
            if (!errorsByType["forbidden"]) {
                errorsByType["forbidden"] = [];
            }
            lLog["errors"].push(style["forbidden"]["collections"]["sort"]);
            errorsByType["forbidden"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["forbidden"]["collections"]["sort"]
            })
        }

        if(checkMultiStatement(line)) {
            if (!errorsByType["multiple_statements_per_line"]) {
                errorsByType["multiple_statements_per_line"] = [];
            }
            lLog["errors"].push(style["multiple_statements_per_line"]);
            errorsByType["multiple_statements_per_line"].push({
                "line": lineNum,
                "code": line,
                "annotation": style["multiple_statements_per_line"]
            })
        }

        // create display code line and modal
        let span = document.createElement('span');
        span.textContent = line;
        if (lLog["errors"].length) {
            span.classList.add('error');
            span.id = 'line' + lineNum;
            span.setAttribute('type', 'button');
            span.setAttribute('data-toggle', 'modal');
            span.setAttribute('data-target', '#line' + lineNum + '-modal'); 
            createModal(lLog, line);
        }
        codeBlock.append(span);
        codeBlock.append("\n");

        lineErrors.push(lLog);
        if (line.includes("class")) {
            inClass = true;
        }
        if (line.includes('{')) {
            indentLevel++;
            emptyStruct = true;
        } else {
            emptyStruct = false;
        }     
    }
    for (let key in Object.keys(errorsByType)) {
        let type = Object.keys(errorsByType)[key];
        let container = document.createElement('div');
        container.classList.add('errors');
        let h3 = document.createElement ('h3');
        h3.textContent = formatError(type);
        container.append(h3);
        for (let e in errorsByType[type]) {
            let card = createCard(errorsByType[type], e, type)
            container.append(card);
        }
        document.getElementById('errors-list').append(container);
    }
    assignRecheckListeners();
    assignRecheckSubmitListeners();
    assignModalCloseListeners();
}

function checkBreak(line) {
    return line.includes("break;");
}

function checkContinue(line) {
    return line.includes("continue;");
}

function checkTryCatch(line) {
    return line.includes("catch");
}

function checkVar(line) {
    return line.includes("var");
}

function checkToArray(line) {
    return line.includes(".toArray");
}

function checkStringBuilder(line) {
    return line.includes("StringBuilder");
}

function checkStringBuffer(line) {
    return line.includes("StringBuffer");
}

function checkStringJoiner(line) {
    return line.includes("StringJoiner");
}

function checkStringTokenizer(line) {
    return line.includes("StringTokenizer");
}

function checkStringToCharArray(line) {
    return line.includes("String.toCharArray");
}

function checkStringJoin(line) {
    return line.includes("String.join");
}

function checkStringMatches(line) {
    return line.includes("String.matches");
}

function checkArraysAsList(line) {
    return line.includes("Arrays.asList");
}

function checkArraysCopyOf(line) {
    return line.includes("Arrays.copyOf");
}

function checkArraysCopyOfRange(line) {
    return line.includes("Arrays.copyOfRange");
}

function checkArraysSort(line) {
    return line.includes("Arrays.sort");
}

function checkCollectionsCopy(line) {
    return line.includes("Collections.copy");
}

function checkCollectionsSort(line) {
    return line.includes("Collections.sort");
}

function checkLineLength(line) {
    return line.length > MAX_LENGTH;
}

function checkMultiStatement(line) {
    return line.split(";").length > 1 && !line.includes("for");
}

function checkIndentation(line, indentLevel) {
    let correctIndentation = "";
    for (let i = 0; i < indentLevel * tabSize; i++) {
        correctIndentation += " ";
    }
    correctIndentation += line.trim();
    if (correctIndentation.length > line.length) {
        return 2;
    } else if (correctIndentation.length < line.length) {
        return 1;
    }
    return 0;
}

function checkZenTrue(line) {
    return line.match(eqTrue);
}

function checkZenFalse(line) {
    return line.match(eqFalse);
}

function checkScreamingCase(line) {
    let splitLine = line.split(/[\s\t\[\]]+/);
    if (line.includes("final")) {
        let name = splitLine[splitLine.indexOf('final') + 2];
        return name !== name.toUpperCase();
    }
    return false;
}

function checkPascalCase(line) {
    let splitLine = line.split(/[\s\t\[\]]+/);
    if (line.includes('class')) {
        let name;
        if(line.includes('public') || line.includes('private') || line.includes('protected')) {
            name = splitLine[2];
        } else {
            name = splitLine[1];
        }
        return name === name.toUpperCase() || name.charAt(0).toUpperCase !== name.charAt(0);
    }
    return false;
}

function formatError(type) {
    type = type.replace("_", " ");
    type = type.toLowerCase();
    let format = "";
    for (let i = 0; i < type.length; i++) {
        if (i == 0 || (type.charAt(i-1) == ' ')) {
            format += type.charAt(i).toUpperCase();
        } else {
            format += type.charAt(i);
        }
    }
    return format;
}

function createCard(typeErrors, e, type) {
    let card = document.createElement('div');
    card.classList.add('card');
    let cardHeader = document.createElement('div');
    cardHeader.classList.add('card-header');
    cardHeader.textContent = "Line " + typeErrors[e].line;
    card.append(cardHeader);
    let cardBody = document.createElement('div');
    cardBody.classList.add('card-body');
    let code = document.createElement('code');
    let s = document.createElement('span');
    s.classList.add('error');
    s.textContent = typeErrors[e].code;
    code.append(s);
    if (type == "long_lines" || type == "indentation") {
        let pre = document.createElement('pre');
        pre.append(code);
        code = pre;
    }
    cardBody.append(code);
    let lead = document.createElement('p');
    lead.classList.add('lead');
    lead.textContent = typeErrors[e].annotation.title;
    cardBody.append(lead);
    let p = document.createElement('p');
    p.textContent = typeErrors[e].annotation.message;
    cardBody.append(p);
    card.append(cardBody);
    return card;
}

function createModal(lLog, line) {
    let body = document.querySelector('body');    
    let modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');
    let modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    let modalTitle = document.createElement('h5');
    modalTitle.classList.add('modal-title');
    modalTitle.textContent = "Line " + lLog["line"];
    modalHeader.append(modalTitle);
    let close = document.createElement('button');
    close.classList.add('close');
    close.setAttribute('data-dismiss', 'modal');
    close.setAttribute('aria-label', 'Close');
    let x = document.createElement('span');
    x.setAttribute('aria-hidden', 'true');
    x.innerHTML = "&times;";
    close.append(x);
    modalHeader.append(close);
    modalContent.append(modalHeader);
    let modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');
    let code = document.createElement('code');
    let s = document.createElement('span');
    s.classList.add('error');
    s.textContent = line;
    code.append(s);
    // let pre = document.createElement('pre');
    // pre.append(code);
    // code = pre;
    modalBody.append(code);
    modalContent.append(modalBody);

    for (let e in lLog["errors"]) {
        let error = lLog["errors"][e];
        let modalBody = document.createElement('div');
        modalBody.classList.add('modal-body');
        let lead = document.createElement('p');
        lead.classList.add('lead');
        lead.textContent = error.title;
        modalBody.append(lead);
        let p = document.createElement('p');
        p.textContent = error.message;
        modalBody.append(p);
        if (error.type) {
            modalBody.setAttribute('error-type', error.type);
        }
        modalContent.append(modalBody);
    }
    let modalFoooter = document.createElement('div');
    modalFoooter.classList.add('modal-footer');
    let editBtn = document.createElement('button');
    editBtn.classList.add('btn');
    editBtn.classList.add('btn-primary');
    editBtn.classList.add('recheck-edit-btn');
    editBtn.setAttribute('type', 'button');
    editBtn.textContent = "Edit & Re-check";
    modalFoooter.append(editBtn);
    let submitBtn = document.createElement('button');
    submitBtn.classList.add('btn');
    submitBtn.classList.add('btn-primary');
    submitBtn.classList.add('recheck-submit-btn');
    submitBtn.setAttribute('type', 'button');
    submitBtn.textContent = "Re-check";
    modalFoooter.append(submitBtn);
    modalContent.append(modalFoooter);  
    let modalDialog = document.createElement('div');
    modalDialog.classList.add('modal-dialog');
    modalDialog.classList.add('modal-dialog-centered');
    modalDialog.classList.add('modal-lg');
    modalDialog.setAttribute('role', 'document');
    modalDialog.append(modalContent);   
    let modal = document.createElement('div');
    modal.classList.add('modal');
    modal.id = 'line' + lLog["line"] + '-modal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.append(modalDialog);
    body.append(modal);
}

// assign listeners to change code modals to edit mode when user choses to edit their code
// within the modal
function assignRecheckListeners() {
    let btns = document.querySelectorAll('.recheck-edit-btn');
    btns.forEach((btn) => {
        btn.addEventListener('click', () => {
            let modal = btn.parentElement.parentElement.parentElement.parentElement;
            if (btn.parentElement.firstElementChild.classList.contains('alert')) {
                btn.parentElement.removeChild(modal.querySelector('.alert'));
            }
            modal.classList.add('editor-modal');
            let error = modal.querySelector('.error');
            let input = document.createElement('input');
            input.type = 'text';
            input.classList.add('form-control');
            input.value = error.textContent;
            error.parentElement.parentElement.prepend(input);
            error.parentElement.parentElement.removeChild(error.parentElement)

            // reflect changes in code made in modals in the code displayed in the main site
            input.addEventListener('input', () => {
                document.getElementById(modal.id.replace("-modal", "")).textContent = input.value;
            });
        });
    });
}

// assign listeners to recheck code  post-editing within modal
function assignRecheckSubmitListeners() {
    let btns = document.querySelectorAll('.recheck-submit-btn');
    btns.forEach((btn) => {
        btn.addEventListener('click', () => {
            let modal = btn.parentElement.parentElement.parentElement.parentElement;
            let issues = checkModal(modal);
            let alert = document.createElement('div');
            alert.classList.add("alert");
            alert.role = "alert";
            if (issues) {
                alert.textContent = issues;
                alert.classList.add("alert-danger");
            } else {
                alert.textContent = "Issue(s) fixed!";
                alert.classList.add("alert-success");
                document.getElementById(modal.id.replace('-modal', '')).classList.remove('error');
                modal.querySelector('.close').addEventListener('click', () => {
                    modal.remove();
                });
                modal.querySelectorAll('.btn').forEach((btn) => btn.remove());
            }
            modal.querySelector('.modal-footer').prepend(alert);
            let error = document.createElement('span');
            error.classList.add('error');
            error.textContent = modal.querySelector('input').value;
            let code = document.createElement('code');
            code.append(error);
            modal.querySelector('.modal-body').prepend(code);
            modal.querySelector('.modal-body').removeChild(modal.querySelector('input'))
            modal.classList.remove('editor-modal');
        });
    });
}

// reset modals to normal upon closing
function assignModalCloseListeners() {
    let btns = document.querySelectorAll('.modal .close');
    btns.forEach((btn) => {
        btn.addEventListener('click', () => {
            let modal = btn.parentElement.parentElement.parentElement.parentElement;
            if (modal.classList.contains('editor-modal')) {
                let error = document.createElement('span');
                error.classList.add('error');
                error.textContent = modal.querySelector('input').value;
                let code = document.createElement('code');
                code.append(error);
                modal.querySelector('.modal-body').prepend(code);
                modal.querySelector('.modal-body').removeChild(modal.querySelector('input'))
                modal.classList.remove('editor-modal');
            }
            if (modal.querySelector('.alert')) {
                modal.querySelector('.alert').remove();
            }  
        });
    });
}

/// code for properly animating and changing collapse button displays ///
function assignCollapseButtonToggling() {
    let togglers = document.querySelectorAll('.collapse-toggler');
    togglers.forEach((toggler) => {
        toggler.addEventListener('click', toggleClick);
    });
}

function toggleClick(e) {
    let target = e.target;
    if (e.target.classList.contains('collapse-button')) {
        target.addEventListener('mouseout', toggleOpenClosed);
    } else {
        let btn = target.querySelector('img');
        if (btn.classList.contains('open')) {
            btn.classList.remove('open');
            btn.classList.add('closed');
        } else {
            btn.classList.add('open');
            btn.classList.remove('closed');
        }
    }
}

function toggleOpenClosed(e) {
    let btn = e.target;
    if (btn.classList.contains('open')) {
        btn.classList.remove('open');
        btn.classList.add('closed');
    } else {
        btn.classList.add('open');
        btn.classList.remove('closed');
    }
    btn.removeEventListener('mouseout', toggleOpenClosed);
}
/// END TOGGLE CODE ///


// returns true if the code has been fixed, false otherwise
function checkModal(modal) {
    let line = modal.querySelector('input').value;
    let errors = modal.querySelectorAll('.modal-body');
    let issues = "";
    let uncheckable = false;
    errors.forEach((error) => {
        //let error = errors[e];
        if (error.getAttribute("error-type")) {
            let fixed = false;
            let type = error.getAttribute('error-type');
            switch(type) {
                case "naming_conventions":
                    fixed = checkPascalCase(line) && checkScreamingCase(line);
                    break;
                case "long_lines":
                    console.log(line);
                    fixed = checkLineLength(line);
                    break;
                case "boolean_zen":
                    fixed = checkZenTrue(line) && checkZenFalse(line);
                    break;
                case "forbidden":
                    fixed = checkBreak(line) && checkContinue(line) && checkTryCatch(line) &&
                            checkVar(line) && checkToArray(line);
                    fixed &= checkStringBuilder(line) && checkStringBuffer(line) && checkStringJoiner(line) && 
                            checkStringTokenizer(line) && checkStringToCharArray(line) && checkStringJoin(line) && 
                            checkStringMatches(line);
                    fixed &= checkArraysAsList(line) && checkArraysCopyOf(list) && 
                            checkArraysCopyOfRange(list) && checkArraysSort(line);
                    fixed &= checkCollectionsCopy(list) && checkCollectionsSort(list);
                    
                    break;
            }
            if (!fixed) {
                error.remove();
            } else if (!uncheckable) {
                issues = "One or more issues not fixed";
            }
        } else {
            issues = "This line has issues that need in-code context to recheck.";
            uncheckable = true;
        }
    });
    return issues;
}
