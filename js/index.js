'use strict';
const MAX_LENGTH = 100;
window.onload = () => {
    
    assignCollapseButtonToggling();

    document.getElementById('splash-link').addEventListener('click', (e) => {
        document.querySelector('body').classList.remove('bg-white');
        document.querySelector('body').classList.add('bg-primary');
    });

    document.getElementById('main-link').addEventListener('click', (e) => {
        document.querySelector('body').classList.add('bg-white');
        document.querySelector('body').classList.remove('bg-primary');
    });

    document.getElementById('file').addEventListener('click', (e) => {
        document.getElementById('file-group').classList.remove('d-none');
        document.getElementById('text-group').classList.add('d-none');
        
        if (document.getElementById('code-file').files) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.getElementById('text').addEventListener('click', (e) => {
        document.getElementById('text-group').classList.remove('d-none');
        document.getElementById('file-group').classList.add('d-none');

        if (document.getElementById('code-text').value) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.getElementById('code-file').addEventListener('input', (e) => {
        if (document.getElementById('code-file').files) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.getElementById('code-text').addEventListener('input', (e) => {
        if (document.getElementById('code-text').value) {
            document.getElementById('submit').disabled = false;
        } else {
            document.getElementById('submit').disabled = true;
        }
    });

    document.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        let tabSize = document.getElementById('tab-size').value;
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
                    let code = getCode(fileButton.checked);
                    lint(code, tabSize, json);
                })
                .catch((err) => {
                    console.error(err);
                })
        
        
    })
};

function getCode(inputFormat) {
    if (inputFormat) {
        let file = document.getElementById('code-file').files[0];
        let reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = (e) => {
            return e.target.result;
        }
        reader.onerror = (e) => {
            console.error("error reading file");
        }
    } else {
        return document.getElementById('code-text').value;
    }
}

function lint(code, tabSize, style) {
    let codeBlock = document.querySelector('#errors-highlighting code');
    let lines = code.split(/\r?\n/);
    let errorsByType = {};
    let indentLevel = 0;
    for(let l in lines) {
        let line = lines[l];
        let lineNum = parseInt(l) + 1;
        if (line.includes('}')) {
            indentLevel--;
        }
        let lLog = {
            "line": lineNum,
            "code": line,
            "errors": []
        };

        // check line length
        if (line.length > MAX_LENGTH) {
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
        let correctIndentation = "";
        for (let i = 0; i < indentLevel * tabSize; i++) {
            correctIndentation += " ";
        }
        correctIndentation += line.trim();
        if (correctIndentation != line) {
            if (!errorsByType["indentation"]) {
                errorsByType["indentation"] = [];
            }
            if (correctIndentation.length > line.length) {
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

        if (line.includes('{')) {
            indentLevel++;
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
    for (let e in lLog["errors"]) {
        let error = lLog["errors"][e];
        let modalBody = document.createElement('div');
        modalBody.classList.add('modal-body');
        if (e == 0) {
            let code = document.createElement('code');
            let s = document.createElement('span');
            s.classList.add('error');
            s.textContent = line;
            code.append(s);
            modalBody.append(code);
        }
        let lead = document.createElement('p');
        lead.classList.add('lead');
        lead.textContent = error.title;
        modalBody.append(lead);
        let p = document.createElement('p');
        p.textContent = error.message;
        modalBody.append(p);
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
            let fixed = checkModal(modal);
            let alert = document.createElement('div');
            alert.classList.add("alert");
            alert.role = "alert";
            if (fixed) {
                alert.textContent = "Issue fixed!";
                alert.classList.add("alert-success");
            } else {
                alert.textContent = "Issue not fixed :(";
                alert.classList.add("alert-danger");
            }
            btn.parentElement.prepend(alert);
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
            } else {
                if (modal.querySelector('alert')) {
                    modal.querySelector('modal-footer').removeChild(modal.querySelector('.alert'));
                }
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
    console.log(modal);
    return false;
}
