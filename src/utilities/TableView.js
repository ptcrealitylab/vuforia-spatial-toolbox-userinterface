export class TableView {
    constructor(rowNames, columnNames, data, container, options) {
        this.rowNames = rowNames;
        this.columnNames = columnNames;

        // Need to keep track of originalData so that we can highlight user-modified data
        this.originalData = data.map(row => {
            // Must convert data to strings to do proper comparison with contents
            return row.map(cell => `${cell}`);
        });
        if (options.colorFunction) {
            this.colorFunction = options.colorFunction;
        } else {
            this.colorFunction = () => 'magenta';
        }
        this.headerImages = options.headerImages || []; // Array of image URLs
        this.container = container;
        this.table = this.createTable();
        this.loadData(this.originalData);
        if (options.persistId) {
            this.persistId = options.persistId;
            this.loadEdits();
        } else {
            this.persistId = null;
        }

        this.initEventListeners();
        this.selectionCallbacks = [];
        this.editCallbacks = [];
        this.isInteractable = false;
        this.newEdit = true; // Allows overriding of text contents without deleting first
    }

    createTable() {
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-view-wrapper';
        const table = document.createElement('table');

        for (let i = 0; i <= this.rowNames.length; i++) {
            const row = table.insertRow();
            for (let j = 0; j <= this.columnNames.length; j++) {
                if (i === 0 && j === 0) {
                    const cell = row.insertCell(); // Top-left corner cell (empty)
                    cell.classList.add('table-view-corner');
                } else if (i === 0) {
                    const cell = row.insertCell();
                    cell.textContent = this.columnNames[j-1];
                    cell.classList.add('table-view-header');
                    cell.classList.add('table-view-column-header');
                    cell.x = j;
                    // Add image if available
                    if (this.headerImages[j-1]) {
                        const img = document.createElement('img');
                        img.src = this.headerImages[j-1];
                        img.alt = this.columnNames[j-1]; // Use column name as alt text
                        img.classList.add('table-view-header-image');
                        cell.appendChild(img);
                    }
                } else if (j === 0) {
                    const cell = row.insertCell();
                    cell.textContent = this.rowNames[i-1];
                    cell.classList.add('table-view-header');
                    cell.classList.add('table-view-row-header');
                    cell.y = i;
                } else {
                    const cell = row.insertCell();
                    cell.x = j;
                    cell.y = i;
                }
            }
        }

        tableWrapper.appendChild(table);
        this.container.appendChild(tableWrapper);
        return table;
    }

    // Updates the table with new data, potentially overriding the originalData
    loadData(data) {
        Array.from(this.table.rows).forEach((row, j) => {
            if (j === 0) {
                return;
            }
            Array.from(row.cells).forEach((cell, i) => {
                if (i === 0) {
                    return;
                }
                if (j-1 < 0 || j-1 >= data.length || i-1 < 0 || i-1 >= data[j-1].length) {
                    return;
                }
                const value = data[j-1][i-1];
                const columnName = this.columnNames[i-1];
                cell.textContent = value;
                cell.style.backgroundColor = `color-mix(in srgb, ${this.colorFunction(value, columnName)}, transparent 80%)`;
                cell.style.color = 'white';
                this.checkModified(cell);
            });
        });
    }
    
    setInteractable(isInteractable) {
        this.isInteractable = isInteractable;
    }

    checkModified(cell) {
        if (cell.textContent === this.originalData[cell.parentNode.rowIndex-1][cell.cellIndex-1]) {
            cell.classList.remove('table-view-data-modified');
        } else {
            cell.classList.add('table-view-data-modified');
        }
    }

    initEventListeners() {
        this.table.addEventListener('click', (e) => {
            if (!this.isInteractable) {
                return;
            }
            let cell = e.target;
            if (cell.tagName === 'IMG') { // Handle clicks on header images
                cell = cell.parentNode;
            }
            const cellIndex = cell.cellIndex;
            const rowIndex = cell.parentNode.rowIndex;

            if (cell.tagName === 'TH' || cell.tagName === 'TD') {
                const originalSelectedElements = Array.from(this.table.querySelectorAll('.selected'));
                const editingCell = this.getEditingCell();
                // Handle cell losing focus
                if (editingCell) {
                    this.commitCellEdits(editingCell);
                }

                if (rowIndex === 0 && cellIndex > 0) {
                    this.selectColumn(cellIndex, e.shiftKey);
                } else if (cellIndex === 0 && rowIndex > 0) {
                    this.selectRow(rowIndex, e.shiftKey);
                } else if (rowIndex > 0 && cellIndex > 0) {
                    this.selectCell(rowIndex, cellIndex, e.shiftKey);
                } else {
                    // Corner cell clicked
                    if (this.table.querySelectorAll('.selected').length === 0) {
                        this.selectAll();
                    } else {
                        this.clearSelection();
                    }
                }

                let newSelectedElements = Array.from(this.table.querySelectorAll('.selected'));
                if (!e.shiftKey) {
                    if (newSelectedElements.length === originalSelectedElements.length) {
                        if (originalSelectedElements.every(element => newSelectedElements.includes(element))) {
                            // Selection did not change, meaning we should clear selection
                            this.clearSelection();
                        }
                    }
                }
                newSelectedElements = Array.from(this.table.querySelectorAll('.selected'));

                if (newSelectedElements.length === 1) {
                    const cell = newSelectedElements[0];
                    cell.classList.add('editing');
                }
                const currentSelectedData = this.getSelectedData();
                this.selectionCallbacks.forEach(cb => cb(currentSelectedData));
            }
        });

        document.addEventListener('keydown', e => {
            if (!this.isInteractable) {
                return;
            }
            const cell = this.getEditingCell();
            if (!cell) {
                return;
            }
            if (!['0','1','2','3','4','5','6','7','8','9','.','Backspace','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'].includes(e.key)) {
                return;
            }
            e.preventDefault(); // Prevents view from jumping around from arrow keys
            e.stopPropagation();
            if (e.key === 'ArrowUp') {
                if (cell.parentNode.rowIndex - 1 > 0) {
                    this.selectCell(cell.parentNode.rowIndex - 1, cell.cellIndex);
                    const currentSelectedData = this.getSelectedData();
                    this.selectionCallbacks.forEach(cb => cb(currentSelectedData));
                    this.table.rows[cell.parentNode.rowIndex - 1].cells[cell.cellIndex].scrollIntoView({ behavior: "smooth"});
                }
                this.commitCellEdits(cell);
                return;
            }
            if (['ArrowDown','Enter'].includes(e.key)) {
                if (cell.parentNode.rowIndex + 1 <= this.rowNames.length) {
                    this.selectCell(cell.parentNode.rowIndex + 1, cell.cellIndex);
                    const currentSelectedData = this.getSelectedData();
                    this.selectionCallbacks.forEach(cb => cb(currentSelectedData));
                    this.table.rows[cell.parentNode.rowIndex + 1].cells[cell.cellIndex].scrollIntoView({ behavior: "smooth"});
                }
                this.commitCellEdits(cell);
                return;
            }
            if (e.key === 'ArrowLeft') {
                if (cell.cellIndex - 1 > 0) {
                    this.selectCell(cell.parentNode.rowIndex, cell.cellIndex - 1);
                    const currentSelectedData = this.getSelectedData();
                    this.selectionCallbacks.forEach(cb => cb(currentSelectedData));
                    this.table.rows[cell.parentNode.rowIndex].cells[cell.cellIndex - 1].scrollIntoView({ behavior: "smooth"});
                }
                this.commitCellEdits(cell);
                return;
            }
            if (e.key === 'ArrowRight') {
                if (cell.cellIndex + 1 <= this.columnNames.length) {
                    this.selectCell(cell.parentNode.rowIndex, cell.cellIndex + 1);
                    const currentSelectedData = this.getSelectedData();
                    this.selectionCallbacks.forEach(cb => cb(currentSelectedData));
                    this.table.rows[cell.parentNode.rowIndex].cells[cell.cellIndex + 1].scrollIntoView({ behavior: "smooth"});
                }
                this.commitCellEdits(cell);
                return;
            }
            if (this.newEdit) {
                cell.textContent = '';
                this.newEdit = false;
            }
            if (['0','1','2','3','4','5','6','7','8','9'].includes(e.key)) {
                cell.textContent += e.key;
            }
            if (e.key === '.') {
                if (!cell.textContent.includes('.')) {
                    cell.textContent += '.';
                }
            }
            if (e.key === 'Backspace') {
                cell.textContent = cell.textContent.slice(0, -1);
            }
            this.checkModified(cell);
            const value = Number.parseFloat(cell.textContent);
            if (!Number.isNaN(value)) {
                const columnName = this.columnNames[cell.cellIndex - 1];
                cell.style.backgroundColor = `color-mix(in srgb, ${this.colorFunction(value, columnName)}, transparent 80%)`;
            }
        }, {capture: true});
    }

    getEditingCell() {
        return this.table.querySelector('.editing');
    }

    commitCellEdits(cell) {
        if (cell.textContent.startsWith('.')) {
            cell.textContent = '0' + cell.textContent;
        }
        if (cell.textContent.endsWith('.')) {
            cell.textContent = cell.textContent.slice(0, -1);
        }
        while (cell.textContent.startsWith('0') && !cell.textContent.startsWith('0.') && cell.textContent.length !== 1) {
            // Remove leading zeroes
            cell.textContent = cell.textContent.slice(1);
        }
        if (cell.textContent.length === 0) {
            cell.textContent = this.originalData[cell.parentNode.rowIndex-1][cell.cellIndex-1];
        }

        const value = Number.parseFloat(cell.textContent);
        if (!Number.isNaN(value)) {
            const columnName = this.columnNames[cell.cellIndex - 1];
            cell.style.backgroundColor = `color-mix(in srgb, ${this.colorFunction(value, columnName)}, transparent 80%)`;
        }

        this.checkModified(cell);
        this.editCallbacks.forEach(cb => cb({
            row: this.rowNames[cell.y - 1],
            column: this.columnNames[cell.x - 1],
            value: cell.textContent
        }));

        this.persistEdits();
    }

    persistEdits() {
        if (!this.persistId) {
            return;
        }
        const edits = [];
        Array.from(this.table.rows).forEach((row, j) => {
            if (j === 0) {
                return;
            }
            Array.from(row.cells).forEach((cell, i) => {
                if (i === 0) {
                    return;
                }
                if (cell.textContent !== this.originalData[j-1][i-1]) {
                    edits.push({
                        row: j,
                        column: i,
                        value: cell.textContent
                    });
                }
            });
        });
        window.localStorage.setItem(`TableView-${this.persistId}`, JSON.stringify(edits));
    }

    loadEdits() {
        if (!this.persistId) {
            return;
        }
        const editsString = window.localStorage.getItem(`TableView-${this.persistId}`);
        if (!editsString) {
            return;
        }
        const edits = JSON.parse(editsString);
        edits.forEach(edit => {
            if (edit.row >= this.table.rows.length) {
                return;
            }
            const cell = this.table.rows[edit.row].cells[edit.column];
            cell.textContent = edit.value;
            cell.classList.add('table-view-data-modified');
            const columnName = this.columnNames[edit.column-1];
            cell.style.backgroundColor = `color-mix(in srgb, ${this.colorFunction(edit.value, columnName)}, transparent 80%)`;
        });
    }

    getSelectedData() {
        const selectedCells = Array.from(this.table.querySelectorAll('.selected')).filter(cell => cell.x !== undefined && cell.y !== undefined);
        return selectedCells.map(cell => {
            return {
                row: this.rowNames[cell.y - 1],
                column: this.columnNames[cell.x - 1],
                value: cell.textContent
            }
        });
    }

    selectCell(row, col, extendSelection) {
        this.newEdit = true;
        const selectedCells = Array.from(this.table.querySelectorAll('.selected'));
        if (extendSelection && selectedCells) {
            const minX = selectedCells.filter(cell => cell.x !== undefined).reduce((prev, curr) => Math.min(prev, curr.x), col);
            const maxX = selectedCells.filter(cell => cell.x !== undefined).reduce((prev, curr) => Math.max(prev, curr.x), col);
            const minY = selectedCells.filter(cell => cell.y !== undefined).reduce((prev, curr) => Math.min(prev, curr.y), row);
            const maxY = selectedCells.filter(cell => cell.y !== undefined).reduce((prev, curr) => Math.max(prev, curr.y), row);
            this.clearSelection();
            for (let j = minX; j <= maxX; j++) {
                for (let i = minY; i <= maxY; i++) {
                    const cell = this.table.rows[i].cells[j];
                    cell.classList.add('selected');
                }
            }
        } else {
            this.clearSelection();
            const cell = this.table.rows[row].cells[col];
            cell.classList.add('selected');
            cell.classList.add('editing');
        }
    }

    selectRow(row, extendSelection) {
        const selectedCells = Array.from(this.table.querySelectorAll('.selected'));
        if (extendSelection && selectedCells) {
            const minY = selectedCells.filter(cell => cell.y !== undefined).reduce((prev, curr) => Math.min(prev, curr.y), row);
            const maxY = selectedCells.filter(cell => cell.y !== undefined).reduce((prev, curr) => Math.max(prev, curr.y), row);
            this.clearSelection();
            for (let j = 0; j <= this.columnNames.length; j++) {
                for (let i = minY; i <= maxY; i++) {
                    const cell = this.table.rows[i].cells[j];
                    cell.classList.add('selected');
                }
            }
        } else {
            this.clearSelection();
            for (let i = 0; i <= this.columnNames.length; i++) {
                const cell = this.table.rows[row].cells[i];
                cell.classList.add('selected');
            }
        }
    }

    selectColumn(col, extendSelection) {
        const selectedCells = Array.from(this.table.querySelectorAll('.selected'));
        if (extendSelection && selectedCells) {
            const minX = selectedCells.filter(cell => cell.x !== undefined).reduce((prev, curr) => Math.min(prev, curr.x), col);
            const maxX = selectedCells.filter(cell => cell.x !== undefined).reduce((prev, curr) => Math.max(prev, curr.x), col);
            this.clearSelection();
            for (let j = minX; j <= maxX; j++) {
                for (let i = 0; i <= this.rowNames.length; i++) {
                    const cell = this.table.rows[i].cells[j];
                    cell.classList.add('selected');
                }
            }
        } else {
            this.clearSelection();
            for (let i = 0; i <= this.rowNames.length; i++) {
                const cell = this.table.rows[i].cells[col];
                cell.classList.add('selected');
            }
        }
    }

    selectAll() {
        for (let j = 0; j <= this.columnNames.length; j++) {
            for (let i = 0; i <= this.rowNames.length; i++) {
                const cell = this.table.rows[i].cells[j];
                cell.classList.add('selected');
            }
        }
    }

    clearSelection() {
        const selectedCells = this.table.querySelectorAll('.selected');
        selectedCells.forEach(cell => {
            cell.classList.remove('selected');
            cell.classList.remove('editing');
        });
    }

    onSelection(callback) {
        this.selectionCallbacks.push(callback);
    }

    removeSelectionCallback(callback) {
        this.selectionCallbacks.splice(this.selectionCallbacks.indexOf(callback), 1);
    }

    onEdit(callback) {
        this.editCallbacks.push(callback);
    }

    removeEditCallback(callback) {
        this.editCallbacks.splice(this.editCallbacks.indexOf(callback), 1);
    }
}

// const container = document.getElementById('table-view-container');
// const rowNames = ['Step 1', 'Step 2', 'Step 3', 'Step 4'];
// const columnNames = ['Head', 'Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'];
// const data = [
//     [4, 5, 1, 2, 6, 4],
//     [6, 4, 3, 3, 3, 5],
//     [5, 7, 4, 5, 7, 4],
//     [8, 8, 4, 2, 3, 3],
// ];
// const testTable = new TableView(rowNames, columnNames, data, container);

// testTable.onSelection((selection) => {
//     console.log('Selection:', selection);
// });
