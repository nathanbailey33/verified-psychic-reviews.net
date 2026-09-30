(function () {
    'use strict';

    var root = document.getElementById('advisor-compare');
    if (!root) return;

    var search = document.getElementById('advisor-compare-search');
    var status = document.getElementById('advisor-compare-status');
    var matches = document.getElementById('advisor-compare-matches');
    var selectedEl = document.getElementById('advisor-compare-selected');
    var results = document.getElementById('advisor-compare-results');
    var catalog = null;
    var selected = [];
    var loading = null;
    var budget = 30;
    var minutes = 10;

    function element(tag, className, value) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (value !== undefined) node.textContent = value;
        return node;
    }

    function money(amount) {
        return '$' + amount.toFixed(2);
    }

    function profileUrl(record) {
        var base = catalog.pb || '/psychics/';
        return base + encodeURIComponent(record[0]) + '/';
    }

    function ensureCatalog() {
        if (catalog) return Promise.resolve(catalog);
        if (loading) return loading;
        status.textContent = 'Loading advisors…';
        loading = fetch(root.getAttribute('data-index-url'), { credentials: 'same-origin' })
            .then(function (response) {
                if (!response.ok) throw new Error('Catalog unavailable');
                return response.json();
            })
            .then(function (data) {
                if (!data || !Array.isArray(data.p) || !Array.isArray(data.sp)) throw new Error('Invalid catalog');
                catalog = data;
                status.textContent = '';
                return data;
            })
            .catch(function () {
                loading = null;
                status.textContent = 'Advisor search is temporarily unavailable.';
                return null;
            });
        return loading;
    }

    function renderMatches() {
        matches.replaceChildren();
        if (!catalog) return;
        var term = search.value.trim().toLocaleLowerCase();
        if (term.length < 2) return;
        if (selected.length >= 3) {
            status.textContent = 'Remove an advisor to add another.';
            return;
        }
        var found = catalog.p.filter(function (item) {
            return typeof item[1] === 'string' && item[1].toLocaleLowerCase().includes(term) &&
                !selected.some(function (chosen) { return chosen[0] === item[0]; });
        }).slice(0, 8);
        status.textContent = found.length ? '' : 'No matching advisors.';
        found.forEach(function (item) {
            var button = element('button', 'advisor-compare__match', item[1] + (item[5] > 0 ? ' · ' + money(item[5]) + '/min' : ' · rate unavailable'));
            button.type = 'button';
            button.addEventListener('click', function () {
                selected.push(item);
                search.value = '';
                status.textContent = '';
                render();
                search.focus();
            });
            matches.appendChild(button);
        });
    }

    function renderSelected() {
        selectedEl.replaceChildren();
        selected.forEach(function (item) {
            var chip = element('span', 'advisor-compare__chip', item[1] + ' ');
            var button = element('button', '', '×');
            button.type = 'button';
            button.setAttribute('aria-label', 'Remove ' + item[1]);
            button.addEventListener('click', function () {
                selected = selected.filter(function (chosen) { return chosen[0] !== item[0]; });
                render();
            });
            chip.appendChild(button);
            selectedEl.appendChild(chip);
        });
    }

    function specialtyNames(item) {
        return (item[9] || []).slice(0, 3).map(function (index) {
            return catalog.sp[index] ? catalog.sp[index][1] : '';
        }).filter(Boolean).join(', ') || 'Not listed';
    }

    function addRow(table, label, getValue) {
        var row = element('tr');
        row.appendChild(element('th', '', label));
        selected.forEach(function (item) { row.appendChild(element('td', '', getValue(item))); });
        table.appendChild(row);
    }

    function renderResults() {
        results.replaceChildren();
        if (selected.length < 2) {
            results.appendChild(element('p', 'advisor-compare__hint', 'Select at least 2 advisors to see a comparison.'));
            return;
        }
        var scroll = element('div', 'advisor-compare__table-scroll');
        var table = element('table');
        var head = element('thead');
        var heading = element('tr');
        heading.appendChild(element('th', '', 'Compare'));
        selected.forEach(function (item) {
            var cell = element('th');
            var link = element('a', '', item[1]);
            link.href = profileUrl(item);
            cell.appendChild(link);
            heading.appendChild(cell);
        });
        head.appendChild(heading);
        table.appendChild(head);
        var body = element('tbody');
        addRow(body, 'Listed price', function (item) { return item[5] > 0 ? money(item[5]) + '/min' : 'Unavailable'; });
        addRow(body, 'Rating', function (item) { return item[2] > 0 ? Number(item[2]).toFixed(1) + '/5' : 'Unavailable'; });
        addRow(body, 'Reviews', function (item) { return Number(item[3] || 0).toLocaleString(); });
        addRow(body, 'Specialties', specialtyNames);
        addRow(body, 'Estimated ' + minutes + '-minute session', function (item) { return item[5] > 0 ? money(item[5] * minutes) : 'Unavailable'; });
        addRow(body, 'Approx. minutes for ' + money(budget), function (item) {
            return item[5] > 0 ? (budget / item[5]).toFixed(1) + ' min' : 'Unavailable';
        });
        table.appendChild(body);
        scroll.appendChild(table);
        results.appendChild(scroll);

        var controls = element('div', 'advisor-compare__calculator');
        var budgetLabel = element('label', '', 'Budget ($)');
        var budgetInput = element('input');
        budgetInput.type = 'number'; budgetInput.min = '1'; budgetInput.max = '10000'; budgetInput.step = '1'; budgetInput.value = budget;
        budgetInput.addEventListener('change', function () {
            var value = Number(budgetInput.value);
            if (Number.isFinite(value) && value >= 1 && value <= 10000) { budget = value; renderResults(); }
            else budgetInput.value = budget;
        });
        budgetLabel.appendChild(budgetInput);
        controls.appendChild(budgetLabel);
        var minutesLabel = element('label', '', 'Session length (minutes)');
        var minutesInput = element('input');
        minutesInput.type = 'number'; minutesInput.min = '1'; minutesInput.max = '300'; minutesInput.step = '1'; minutesInput.value = minutes;
        minutesInput.addEventListener('change', function () {
            var value = Number(minutesInput.value);
            if (Number.isInteger(value) && value >= 1 && value <= 300) { minutes = value; renderResults(); }
            else minutesInput.value = minutes;
        });
        minutesLabel.appendChild(minutesInput);
        controls.appendChild(minutesLabel);
        results.insertBefore(controls, scroll);
    }

    function render() { renderSelected(); renderMatches(); renderResults(); }

    search.addEventListener('focus', ensureCatalog);
    search.addEventListener('input', function () { ensureCatalog().then(renderMatches); });
    renderResults();
}());
