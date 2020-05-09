'use strict';
const MAX_LENGTH = 100;
const eqTrue = /(.*)==( *)true(.*)/g;
const eqFalse = /(.*)==( *)false(.*)/g;
const scan = /(.*)new Scanner\(System\.in\)(.)*/g;
const state = {
    lineErrors: [],
    errorsByType: {}
}

let tabSize;
let style;

window.onload = () => {     
    assignCollapseButtonToggling();
    assignLinkListeners();
    assignValidation();    

    document.querySelector('form').addEventListener('submit', submitForm);
};

// assign event listeners to change main display for each page
function assignLinkListeners() {
    let body = document.querySelector('body');
    document.getElementById('splash-link').addEventListener('click', () => {
        body.classList.remove('bg-white');
        body.classList.add('bg-primary');
    });

    document.getElementById('main-link').addEventListener('click', () => {
        body.classList.add('bg-white');
        body.classList.remove('bg-primary');
    });
}

// assign extra validation for code form
function assignValidation() {
    let submit = document.getElementById('submit');
    document.getElementById('file').addEventListener('click', () => {
        document.getElementById('file-group').classList.remove('d-none');
        document.getElementById('text-group').classList.add('d-none');
        
        if (document.getElementById('code-file').files.length) {
            submit.disabled = false;
        } else {
            submit.disabled = true;
        }
    });
    document.getElementById('text').addEventListener('click', () => {
        document.getElementById('text-group').classList.remove('d-none');
        document.getElementById('file-group').classList.add('d-none');

        if (document.getElementById('code-text').value) {
            submit.disabled = false;
        } else {
            submit.disabled = true;
        }
    });
    document.getElementById('code-file').addEventListener('input', () => {
        if (document.getElementById('code-file').files.length) {
            submit.disabled = false;
        } else {
            submit.disabled = true;
        }
    });
    document.getElementById('code-text').addEventListener('input', () => {
        if (document.getElementById('code-text').value) {
            submit.disabled = false;
        } else {
            submit.disabled = true;
        }
    });
}

// submit code form and lint input code
// event is the event that triggers this
function submitForm(event) {
    event.preventDefault();
    tabSize = document.getElementById('tab-size').value;
    let fileButton = document.getElementById('file');
    fetch('js/json/style.json')
            .then((response) => {
                return response.json();
            })
            .then((json) => {
                style = json;
                if (fileButton.checked) {
                    let file = document.getElementById('code-file').files[0];
                    let reader = new FileReader();
                    reader.readAsText(file, "UTF-8");
                    reader.onload = (e) => { 
                        lint(e.target.result);
                    }
                    reader.onerror = () => {
                        console.error("error reading file");
                    }
                } else {
                    lint(document.getElementById('code-text').value);
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
}

// lint code for errors. split input code into lines, check each line for issues
// and update state with all found errors (using descriptions from input style json), 
// and then render errors on page
function lint(code) {
    state.lineErrors = [];
    state.errorsByType = {};
    
    let emptyStruct = false;
    let scanners = 0;
    let lines = code.split(/\r?\n/);  
    let indentLevel = 0;

    for(let l in lines) {
        let line = lines[l];  
        let lineNum = parseInt(l) + 1;
        let lLog = {
            "line": lineNum,
            "code": line,
            "errors": []
        }
        state.lineErrors.push(lLog);

        if (line.match(/^[ \t]*$/)) {
            continue;
        }
        if (line.includes("}")) {
            indentLevel--;
            // check if this } ends an empty control structure
            if (emptyStruct) {
                updateErrors(lineNum, "empty_struct");
            }
        }   
        // check line length
        if (checkLineLength(line)) {
            updateErrors(lineNum, "long_lines");
        }
        // check indentation
        let indentCheck = checkIndentation(line, indentLevel);
        if (indentCheck) {
            if (indentCheck == 2) {
                updateErrors(lineNum, "indentation", "under");
            } else {
                updateErrors(lineNum, "indentation", "over");
            }
        }

        if (line.includes('{')) {
            indentLevel++;
            emptyStruct = true;
        } else {
            emptyStruct = false;
        } 

        // check basic boolean zen
        if (checkZenTrue(line)) {
            updateErrors(lineNum, "boolean_zen", "equals_true");
        }
        if (checkZenFalse(line)) {
            updateErrors(lineNum, "boolean_zen", "equals_false");
        }

        // check for multiple Scanners
        if (line.match(scan)) {
            scanners++;
        }
        if (scanners > 1) {
            updateErrors(lineNum, "scanners");
        }

        // check constant naming conventions
        if (checkScreamingCase(line)) {
            updateErrors(lineNum, "naming_conventions", "screaming");
        }

        // check class naming conventions
        if (checkPascalCase(line)) {
            updateErrors(lineNum, "naming_conventions", "pascal");
        }

        // check for use of 14X forbidden features
        if (checkBreak(line)) {
            updateErrors(lineNum, "forbidden_features", "break");
        }
        if (checkContinue(line)) {
            updateErrors(lineNum, "forbidden_features", "continue");
        }
        if (checkTryCatch(line)) {
            updateErrors(lineNum, "forbidden_features", "try/catch");
        }
        if (checkVar(line)) {
            updateErrors(lineNum, "forbidden_features", "var");
        }
        if (checkToArray(line)) {
            updateErrors(lineNum, "forbidden_features", "toArray");
        }
        if (checkStringBuilder(line)) {
            updateErrors(lineNum, "forbidden_features", "string", "builder");
        }
        if (checkStringBuffer(line)) {
            updateErrors(lineNum, "forbidden_features", "string", "buffer");
        }
        if (checkStringJoiner(line)) {
            updateErrors(lineNum, "forbidden_features", "string", "joiner");
        }
        if (checkStringTokenizer(line)) {
            updateErrors(lineNum, "forbidden_features", "string", "tokenizer");
        }
        if (checkStringToCharArray(line)) {
            updateErrors(lineNum, "forbidden_features", "string", "toCharArray");
        }
        if (checkStringJoin(line)) {
            updateErrors(lineNum, "forbidden_features", "string", "join");
        }
        if (checkStringMatches(line)) {
            updateErrors(lineNum, "forbidden_features", "string", "matches");
        }
        if (checkArraysAsList(line)) {
            updateErrors(lineNum, "forbidden_features", "arrays", "asList");
        }
        if (checkArraysCopyOf(line)) {
            updateErrors(lineNum, "forbidden_features", "arrays", "copyOf");
        }
        if (checkArraysCopyOfRange(line)) {
            updateErrors(lineNum, "forbidden_features", "arrays", "copyOfRange");
        }
        if (checkArraysSort(line)) {
            updateErrors(lineNum, "forbidden_features", "arrays", "sort");
        }
        if (checkCollectionsCopy(line)) {
            updateErrors(lineNum, "forbidden_features", "collections", "copy");
        }
        if (checkCollectionsSort(line)) {
            updateErrors(lineNum, "forbidden_features", "arrays", "sort");
        }

        // check for multiple statements on one line
        if(checkMultiStatement(line)) {
            updateErrors(lineNum, "multiple_statements_per_line");
        }

        // check for 'prinitng problems'
        if (checkBlankPrintlns(line)) {
            updateErrors(lineNum, "printing_problems", "blank");
        }
        if (checkBackslashN(line)) {
            updateErrors(lineNum, "printing_problems", "backslash_n");
        }                  
    }
    renderErrors(true);
    
}

function updateErrors(lineNum, category, subCategory, subSubCategory) {  
    if (!state.errorsByType[category]) {
        state.errorsByType[category] = [];
    }
    let error = {
        "line": lineNum,
        "code": state.lineErrors[lineNum]
    }
    if (subCategory) {
        if (subSubCategory) {
            error["annotation"] = style[category][subCategory][subSubCategory];
            state.lineErrors[lineNum - 1]["errors"].push(style[category][subCategory][subSubCategory]);
        } else {
            error["annotation"] = style[category][subCategory];
            state.lineErrors[lineNum - 1]["errors"].push(style[category][subCategory]);
        }
    } else {
        error["annotation"] = style[category];
        state.lineErrors[lineNum - 1]["errors"].push(style[category]);
    }
    state.errorsByType[category].push(error);
}

function renderErrors(createModals) {  
    document.getElementById('errors-list').innerHTML = '';
    document.querySelector('#errors-highlighting code').innerHTML = '';
    if (createModals) {
        let modals = document.querySelectorAll('.modal');
        if (modals.length > 0) {
            for (let i = 0; i < modals.length; i++){
                modals[i].remove();
            }
        }
    }
    for (let i = 0; i < state.lineErrors.length; i++) {
        renderLine(state.lineErrors[i], createModals);
    }
    renderErrorList();
    assignRecheckListeners();
    assignRecheckSubmitListeners();
    assignModalCloseListeners();
}



function renderLine(errors, createModal) {
    let codeBlock = document.querySelector('#errors-highlighting code');
    let lineNum = errors.line;
    let line = errors.code;
    let span = document.createElement('span');
    span.textContent = line;
    if (errors.errors.length) {
        span.classList.add('error');
        span.id = 'line' + lineNum;
        span.setAttribute('type', 'button');
        span.setAttribute('data-toggle', 'modal');
        span.setAttribute('data-target', '#line' + lineNum + '-modal'); 
        if(createModal) {
            renderModal(errors);
        }  
    }
    codeBlock.append(span);
    codeBlock.append("\n");
}

function renderErrorList() {
    for (let key in Object.keys(state.errorsByType)) {
        let type = Object.keys(state.errorsByType)[key];
        let container = document.createElement('div');
        container.classList.add('errors');
        let h3 = document.createElement ('h3');
        h3.textContent = formatError(type);
        container.append(h3);
        for (let e in state.errorsByType[type]) {
            container.append(renderCard(state.errorsByType[type], e, type));
        }
        document.getElementById('errors-list').append(container);
    }
}

function renderModal(errors) {  
    let modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    modalContent.append(createModalHeader(errors));
    modalContent.append(createCodeBody(errors));
    for (let e in errors.errors) {     
        modalContent.append(createModalBody(errors.errors[e]));
    }
    modalContent.append(createModalFooter());  

    let modalDialog = document.createElement('div');
    modalDialog.classList.add('modal-dialog');
    modalDialog.classList.add('modal-dialog-centered');
    modalDialog.classList.add('modal-lg');
    modalDialog.setAttribute('role', 'document');
    modalDialog.append(modalContent);   
    let modal = document.createElement('div');
    modal.classList.add('modal');
    modal.id = 'line' + errors.line + '-modal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('role', 'dialog');
    modal.append(modalDialog);
    document.querySelector('body').append(modal);
}

function renderCard(typeErrors, e, type) {
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

function createModalHeader(errors) {
    let modalHeader = document.createElement('div');
    modalHeader.classList.add('modal-header');
    let modalTitle = document.createElement('h5');
    modalTitle.classList.add('modal-title');
    modalTitle.textContent = "Line " + errors.line;
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
    return modalHeader;
}

function createCodeBody(errors) {
    let modalBody = document.createElement('div');
    modalBody.classList.add('modal-body');
    let code = document.createElement('code');
    let s = document.createElement('span');
    s.classList.add('error');
    s.textContent = errors.code;
    code.append(s);
    modalBody.append(code);
    return modalBody;
}

function createModalBody(error) {
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
    return modalBody;
}

function createModalFooter() {
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
    return modalFoooter;
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
    return line.split(";").length > 2 && !line.includes("for");
}

function checkBlankPrintlns(line) {
    return line.match(/System\.out\.println\("[ ]*"\)/g);
}

function checkBackslashN(line) {
    return line.includes("\\n") && !line.includes("printf");
}

function checkIndentation(line, indentLevel) {
    let correctIndentation = "";
    for (let i = 0; i < indentLevel * tabSize; i++) {
        correctIndentation += " ";
    }
    correctIndentation += line.trim();
    while (line.charAt(line.length - 1) == ' ') {
        line = line.substring(0, line.length - 1);
    }
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
    let splitLine = line.split(/[\s\t[\]]+/);
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
        return name === name.toUpperCase() || name.charAt(0).toUpperCase() !== name.charAt(0);
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
            // input.addEventListener('input', () => {
            //     document.getElementById(modal.id.replace("-modal", "")).textContent = input.value;
            // });
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
            modal.querySelector('.modal-body').removeChild(modal.querySelector('input'));
            modal.classList.remove('editor-modal');

            let lineNum = parseInt(modal.id.replace("line", "").replace("-modal", ""));
            state.lineErrors[lineNum - 1].code = error.textContent;
            for (let key in Object.keys(state.errorsByType)) {
                let type = Object.keys(state.errorsByType)[key];
                for (let e in state.errorsByType[type]) {
                    if (state.errorsByType[type][e].line == lineNum) {
                        state.errorsByType[type][e].code = error.textContent;
                    }
                }
            }
            renderErrors(false);
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
    for (let i = 1; i < errors.length; i++) {
        let error = errors[i];
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
                case "forbidden_features":
                    fixed = checkBreak(line) && checkContinue(line) && checkTryCatch(line) &&
                            checkVar(line) && checkToArray(line);
                    fixed &= checkStringBuilder(line) && checkStringBuffer(line) && checkStringJoiner(line) && 
                            checkStringTokenizer(line) && checkStringToCharArray(line) && checkStringJoin(line) && 
                            checkStringMatches(line);
                    fixed &= checkArraysAsList(line) && checkArraysCopyOf(line) && 
                            checkArraysCopyOfRange(line) && checkArraysSort(line);
                    fixed &= checkCollectionsCopy(line) && checkCollectionsSort(line);
                    break;
                case "printing_problems":
                    fixed = checkBlankPrintlns(line);
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
    }
    return issues;
}
