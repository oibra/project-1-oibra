'use strict';

window.onload = () => {
    assignRecheckListeners();
    assignRecheckSubmitListeners();
    assignModalCloseListeners();
    assignCollapseButtonToggling();
    document.querySelector('form').addEventListener('submit', (e) => {
        e.preventDefault();
        let fileButton = document.getElementById('file');
        let code;
        if (fileButton.checked) {
            let file = document.getElementById('code-file').files[0];
            console.log(file);
            if (file) {
                let reader = new FileReader();
                reader.readAsText(file, "UTF-8");
                reader.onload = (e) => {
                    code = e.target.result;
                    console.log(code);
                    lint(code);
                }
                reader.onerror = (e) => {
                    console.error("error reading file");
                }
            }
        } else {
            code = document.getElementById('code-text').value;
            console.log(code);
            lint(code);
        }
        
    })
};

function lint(code) {

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
