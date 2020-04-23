'use strict';

window.onload = () => {
    assignRecheckListeners();
    assignRecheckSubmitListeners();
    assignModalCloseListeners();
};

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
            input.addEventListener('input', () => {
                document.getElementById(modal.id.replace("-modal", "")).textContent = input.value;
            });
        });
    });
}

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

// returns true if the code has been fixed, false otherwise
function checkModal(modal) {
    console.log(modal);
    return false;
}
