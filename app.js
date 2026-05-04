// CONFIG
const SUPABASE_URL = 'https://yqywoqtrbaydxatxatxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeXdvcXRyYmF5ZHhhdHhhdHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODkyNTIsImV4cCI6MjA5MzM2NTI1Mn0.1fVzJTQS6lx4tW6a2hmAbRIThwF-qrsewHcRpEY0b2Y';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// KM MAP (Exact from code.txt)
const KM_MAP = {
    "DDSC DN|KKDA DN": 26.22,
    "DDSC DN PF|KKDA DN": 26.22,
    "DDSC DN PF STABLE|KKDA DN": 26.22,
    "DDSC SDG|PBGW UP": 12.26,
    "DDSC SDG STABLE|PBGW UP": 12.26,
    "DDSC SDG|KKDA DN": 26.75,
    "DDSC SDG STABLE|KKDA DN": 26.75,
    "DDSC|DDSC SDG STABLE": 0.5,
    "DDSC|DDSC SDG": 0.5,
    "IPE|PBGW UP": 34.92,
    "IPE|KKDA UP": 3.16,
    "KKDA DN|SAKP": 27.26,
    "KKDA DN|MUPR DN": 7.3,
    "KKDA DN|MKPR": 20.67,
    "KKDA DN|PBGW DN": 29.10,
    "KKDA DN|DDSC DN PF STABLE": 40.96,
    "KKDA DN|DDSC DN PF": 40.96,
    "KKDA DN|DDSC DN": 40.96,
    "KKDA DN|DDSC SDG STABLE": 41.46,
    "KKDA DN|DDSC SDG": 41.46,
    "MUPR DN|MUPR 4TH SDG": 1.4,
    "KKDA UP|PBGW UP": 38.08,
    "KKDA UP|IPE": 3.16,
    "KKDA UP|NZM": 13.26,
    "MKPR|KKDA UP": 20.67,
    "MKPR|PBGW DN": 8.43,
    "MKPR|SAKP": 6.59,
    "MKPR|MUPR": 13.36,
    "MUPR|SVVR DN SDG": 4,
    "MUPR|SVVR DN SDG STABLE": 4,
    "MUPR|MUPR 4TH PF STABLE": 1,
    "MUPR|MUPR 4TH PF": 1,
    "MUPR|MUPR 4TH SDG": 1.4,
    "MUPR|MUPR 3RD SDG": 1.4,
    "MUPR|MUPR DN PF STABLE": 0,
    "MUPR 3RD SDG|KKDA UP": 7.7,
    "MUPR 3RD SDG STABLE|KKDA UP": 7.7,
    "MUPR 3RD SDG STABLE|SVVR UP": 4,
    "MUPR 3RD SDG|SVVR UP": 4,
    "MUPR 4TH|KKDA UP": 7.3,
    "MUPR 4TH PF|KKDA UP": 7.3,
    "MUPR 4TH PF STABLE|SVVR UP": 3.6,
    "MUPR 4TH PF|SVVR UP": 3.6,
    "MUPR 4TH SDG|SVVR UP": 4,
    "MUPR 4TH SDG STABLE|SVVR UP": 4,
    "MUPR DN|PBGW DN": 21.79,
    "MVPO DN|KKDA DN": 7.95,
    "NZM|MVPO DN": 6.31,
    "NZM|MVPO DN PF STABLE": 6.31,
    "NZM|MVPO DN PF": 6.31,
    "PBGW DN|DDSC DN PF STABLE": 11.86,
    "PBGW DN|DDSC DN PF": 11.86,
    "PBGW DN|DDSC DN": 11.86,
    "PBGW DN|DDSC SDG STABLE": 12.26,
    "PBGW DN|DDSC SDG": 12.26,
    "PBGW DN|IPE": 34.92,
    "PBGW DN|KKDA DN": 38.08,
    "PBGW DN|DDSC":11.86,
    "PBGW UP|KKDA UP": 29.10,
    "PBGW UP|MUPR":21.79,
    "PBGW UP|MKPR":8.43,
    "SAKP 3RD|PBGW DN":1.84,
    "SVVR DN|KKDA UP":11.91,
    "SVVR DN PF|KKDA UP":11.91,
    "SVVR DN PF STABLE|KKDA UP":11.91,
    "SVVR DN|SVVR DN SDG STABLE":0.4,
    "SVVR DN|SVVR DN SDG":0.4,
    "SVVR DN PF|SVVR DN SDG STABLE":0.4,
    "SVVR DN PF|SVVR DN SDG":0.4,
    "SVVR DN SDG|MUPR": 4,
    "SVVR DN SDG STABLE|MUPR": 4
};

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        page.classList.add('cinematic-enter');
        setTimeout(() => page.classList.remove('cinematic-enter'), 800);
    }
}

function timeToMins(timeStr) {
    if (!timeStr || typeof timeStr !== 'string' || timeStr.indexOf(':') === -1) return -1;
    const parts = timeStr.split(':');
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

function mathTolerant(t1, t2) {
    return Math.abs(t1 - t2) <= 1;
}

async function getDutyData(type, dutyNo) {
    try {
        const { data, error } = await sb
            .from('trip_data')
            .select('*')
            .eq('day_type', type)
            .order('id', { ascending: true });
        
        if (error) {
            console.error('Supabase error:', error);
            return { error: 'Database error: ' + error.message };
        }
        
        if (!data || data.length === 0) {
            return { error: 'No database found for ' + type };
        }
        
        // Fetch WEF and remarks from app_config
        let wef = '', remarks = '';
        try {
            const { data: configData } = await sb.from('app_config').select('config_key, config_value');
            if (configData) {
                configData.forEach(c => {
                    if (c.config_key === type + '_wef') wef = c.config_value;
                    if (c.config_key === type + '_remarks') remarks = c.config_value;
                });
            }
        } catch (e) {}
        
        const searchDuty = dutyNo.toString().trim().toLowerCase().replace('.0', '');
        let found = false;
        const roster = [];
        
        for (let j = 0; j < data.length; j++) {
            const rawCell = data[j].duty_no;
            const cellValue = (rawCell || '').toString().trim().toLowerCase().replace('.0', '');
            
            if (cellValue === searchDuty && cellValue !== '') {
                found = true;
                roster.push(data[j]);
            } else if (found && (rawCell === '' || rawCell === undefined || rawCell === null)) {
                if (data[j].rake_id || data[j].dep_loc) roster.push(data[j]);
                else if (data[j].duty_no === '' && Object.values(data[j]).filter(v => v).length < 3) break;
            } else if (found && cellValue !== '' && cellValue !== searchDuty) {
                break;
            }
        }
        
        if (!found || roster.length === 0) {
            return { error: 'Duty ' + dutyNo + ' not found.' };
        }
        
        let totalKm = 0;
        for (let i = 0; i < roster.length; i++) {
            const r = roster[i];
            let kmValue = 0;
            if (r.rake_id && r.rake_id.toString().trim() !== '') {
                const from = (r.dep_loc || '').toString().trim().toUpperCase();
                const to = (r.arr_loc || '').toString().trim().toUpperCase();
                kmValue = KM_MAP[from + '|' + to] || 0;
                totalKm += kmValue;
            }
            r.calculated_km = kmValue;
        }
        
        const rakeGaps = analyzeRakeRelievers(data);
        
        return { roster: roster, totalKm: totalKm.toFixed(2), rakeGaps: rakeGaps, wef: wef, remarks: remarks };
    } catch (e) { return { error: e.toString() }; }
}

function analyzeRakeRelievers(tripData) {
    try {
        const rakeTrips = {};
        for (let i = 0; i < tripData.length; i++) {
            const rake = (tripData[i].rake_id || '').toString().trim();
            if (!rake) continue;
            if (!rakeTrips[rake]) rakeTrips[rake] = [];
            rakeTrips[rake].push({
                duty: tripData[i].duty_no,
                depTime: tripData[i].dep_time,
                arrTime: tripData[i].arr_time,
                arrLoc: (tripData[i].arr_loc || '').toString().trim().toUpperCase(),
                depLoc: (tripData[i].dep_loc || '').toString().trim().toUpperCase(),
                rake: rake
            });
        }
        const gaps = {};
        for (const rake in rakeTrips) {
            let trips = rakeTrips[rake];
            trips.sort((a, b) => timeToMins(a.depTime) - timeToMins(b.depTime));
            const deduped = [];
            const tripSeen = {};
            for (let k = 0; k < trips.length; k++) {
                const key = trips[k].depTime + '|' + trips[k].arrTime + '|' + trips[k].depLoc + '|' + trips[k].arrLoc;
                if (!tripSeen[key]) {
                    tripSeen[key] = true;
                    deduped.push(trips[k]);
                }
            }
            trips = deduped;
            if (trips.length > 0) {
                if (!mathTolerant(timeToMins(trips[0].depTime), timeToMins(trips[0].arrTime))) {
                    gaps[rake + '|' + trips[0].depTime] = true;
                }
            }
            for (let j = 0; j < trips.length - 1; j++) {
                const currentEnd = timeToMins(trips[j].arrTime);
                const nextStart = timeToMins(trips[j+1].depTime);
                const sameDuty = trips[j].duty === trips[j+1].duty;
                const mkprException = (trips[j].arrLoc === 'MKPR' && trips[j+1].depLoc === 'MKPR' && sameDuty);
                if (!mathTolerant(currentEnd, nextStart)) {
                    if (!mkprException) {
                        gaps[rake + '|' + trips[j].arrTime] = true;
                        gaps[rake + '|' + trips[j+1].depTime] = true;
                    }
                }
            }
            if (trips.length > 0) {
                const lastTrip = trips[trips.length - 1];
                if (!mathTolerant(timeToMins(lastTrip.depTime), timeToMins(lastTrip.arrTime))) {
                    gaps[rake + '|' + lastTrip.arrTime] = true;
                }
            }
        }
        return gaps;
    } catch (e) {
        console.log('Reliever Analysis Error: ' + e);
        return {};
    }
}

function displayResult(data, dutyNo, dayType) {
    const container = document.getElementById('resultContent');
    const firstRow = data.roster[0] || {};
    const lastRow = data.roster[data.roster.length - 1] || {};
    
    let html = '<div class="result-card"><h3 style="color:var(--cyan);margin-bottom:15px;">Duty ' + dutyNo + ' - ' + dayType + '</h3>';
    
    // WEF and Remarks (from original)
    if (data.wef || data.remarks) {
        html += '<div style="background:rgba(0,212,255,0.1);padding:10px 15px;border-radius:8px;margin-bottom:15px;border:1px solid rgba(0,212,255,0.2);display:flex;gap:20px;flex-wrap:wrap;">';
        if (data.wef) html += '<div><div style="font-size:10px;color:rgba(255,255,255,0.6);">WEF</div><div style="color:var(--cyan);font-weight:bold;">' + data.wef + '</div></div>';
        if (data.remarks) html += '<div><div style="font-size:10px;color:rgba(255,255,255,0.6);">REMARKS</div><div style="color:var(--orange);">' + data.remarks + '</div></div>';
        html += '</div>';
    }
    
    // Sign on/off info + Driving Hours (from original code.txt)
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;margin-bottom:20px;">' +
        '<div style="background:rgba(0,212,255,0.15);padding:12px;border-radius:10px;border:1px solid rgba(0,212,255,0.3);">' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:4px;">SIGN ON</div>' +
            '<div style="color:var(--cyan);font-weight:bold;">' + (firstRow.sign_on_loc || '-') + '</div>' +
            '<div style="color:var(--orange);font-family:Syncopate;">' + (firstRow.sign_on_time || '-') + '</div>' +
        '</div>' +
        '<div style="background:rgba(239,68,68,0.15);padding:12px;border-radius:10px;border:1px solid rgba(239,68,68,0.3);">' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:4px;">SIGN OFF</div>' +
            '<div style="color:var(--red);font-weight:bold;">' + (lastRow.sign_off_loc || '-') + '</div>' +
            '<div style="color:var(--orange);font-family:Syncopate;">' + (lastRow.sign_off_time || '-') + '</div>' +
        '</div>' +
        '<div style="background:rgba(34,197,94,0.15);padding:12px;border-radius:10px;border:1px solid rgba(34,197,94,0.3);">' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:4px;">RUNNING TIME</div>' +
            '<div style="color:var(--green);font-weight:bold;font-family:Syncopate;">' + (firstRow.running_time || '-') + '</div>' +
        '</div>' +
        '<div style="background:rgba(168,85,247,0.15);padding:12px;border-radius:10px;border:1px solid rgba(168,85,247,0.3);">' +
            '<div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:4px;">DUTY REMARKS</div>' +
            '<div style="color:var(--purple);font-weight:bold;">' + (firstRow.duty_remarks || '-') + '</div>' +
        '</div>' +
    '</div>';
    
    html += '<div class="table-wrap"><table class="data-table"><tr><th>Duty</th><th>Rake</th><th>From</th><th>Dep Time</th><th>To</th><th>Arr Time</th><th>KM</th></tr>';
    data.roster.forEach(r => {
        const hasRake = r.rake_id && r.rake_id.toString().trim() !== '';
        const isGap = hasRake && data.rakeGaps && data.rakeGaps[r.rake_id + '|' + r.arr_time];
        const rowStyle = isGap ? 'background:rgba(239,68,68,0.2);' : '';
        html += '<tr style="' + rowStyle + '">' +
            '<td>' + (r.duty_no || '') + '</td>' +
            '<td>' + (r.rake_id || '') + '</td>' +
            '<td>' + (r.dep_loc || '') + '</td>' +
            '<td>' + (r.dep_time || '') + '</td>' +
            '<td>' + (r.arr_loc || '') + '</td>' +
            '<td>' + (r.arr_time || '') + '</td>' +
            '<td><span class="km-tag">' + (r.calculated_km || 0) + ' km</span></td>' +
        '</tr>';
    });
    html += '</table></div>';
    
    // Break/Reliever Schedule - show ALL gaps for duty's rakes (original behavior)
    const dutyRakes = [...new Set(data.roster.map(r => r.rake_id).filter(x => x))];
    const gapKeys = data.rakeGaps ? Object.keys(data.rakeGaps).filter(gap => {
        const rakeId = gap.split('|')[0];
        return dutyRakes.includes(rakeId);
    }) : [];
    
    if (gapKeys.length > 0) {
        html += '<div style="margin-top:15px;padding:15px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;">' +
            '<h4 style="color:var(--red);margin-bottom:10px;">⚠️ BREAK SCHEDULE - Reliever Changes Needed</h4>' +
            '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
        gapKeys.forEach(gap => {
            const parts = gap.split('|');
            html += '<span style="background:rgba(239,68,68,0.2);padding:6px 12px;border-radius:6px;font-size:12px;border:1px solid rgba(239,68,68,0.4);">' +
                'Rake ' + parts[0] + ' @ ' + parts[1] + '</span>';
        });
        html += '</div></div>';
    }
    
    html += '<div class="summary-grid">' +
        '<div class="summary-box"><div class="label">TOTAL KM</div><div class="value orange">' + data.totalKm + ' km</div></div>' +
        '<div class="summary-box"><div class="label">TRIPS</div><div class="value cyan">' + data.roster.length + '</div></div>' +
    '</div></div>';
    container.innerHTML = html;
}

async function fetchDuty(source) {
    const dutyNo = source === 'home' ? document.getElementById('dutyInputHome').value : document.getElementById('dutyInputQuick').value;
    const dayType = document.getElementById('daySelect').value;
    if (!dutyNo) { alert('Please enter a duty number'); return; }
    const result = await getDutyData(dayType, dutyNo);
    if (result.error) { alert(result.error); return; }
    displayResult(result, dutyNo, dayType);
    if (source === 'home') showPage('pageResult');
}

function toggleRegisterModal() {
    const modal = document.getElementById('registerModal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

async function handleRegister() {
    const name = document.getElementById('regName').value;
    const empId = document.getElementById('regEmpId').value;
    const accessLevel = document.getElementById('regAccessLevel').value;
    const accessCode = document.getElementById('regAccessCode').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    
    if (password !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match!';
        errorDiv.style.display = 'block';
        return;
    }
    if (accessCode !== 'satvik') {
        errorDiv.textContent = 'Invalid Access Code!';
        errorDiv.style.display = 'block';
        return;
    }
    
    const normalizedId = empId.toString().trim().toUpperCase();
    const passwordHash = hashPassword(password);
    
    try {
        const { data: existing } = await sb.from('profiles').select('emp_id').eq('emp_id', normalizedId);
        if (existing) {
            errorDiv.textContent = 'Emp ID already registered!';
            errorDiv.style.display = 'block';
            return;
        }
        
        await sb.from('profiles').insert({
            emp_id: normalizedId,
            full_name: name,
            password_hash: passwordHash,
            access_level: accessLevel,
            created_at: new Date()
        });
        
        successDiv.textContent = 'Registration successful! Please login.';
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        setTimeout(() => toggleRegisterModal(), 2000);
    } catch (e) {
        errorDiv.textContent = 'Error: ' + e.toString();
        errorDiv.style.display = 'block';
    }
}

function closePopup() {
    document.getElementById('popupOverlay').classList.remove('show');
}

async function saveUserMsg() {
    const msg = document.getElementById('userMsgInput').value;
    if (!msg) return;
    try {
        await sb.from('app_config').upsert({ config_key: 'UserMessage', config_value: msg, updated_at: new Date() }, { onConflict: 'config_key' });
        document.getElementById('userMsgText').textContent = msg;
        document.getElementById('userMsgBanner').style.display = 'flex';
        alert('Message saved!');
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function clearUserMsg() {
    try {
        await sb.from('app_config').delete().eq('config_key', 'UserMessage');
        document.getElementById('userMsgInput').value = '';
        document.getElementById('userMsgBanner').style.display = 'none';
        alert('Message cleared!');
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function savePopupMsg() {
    const msg = document.getElementById('popupMsgInput').value;
    if (!msg) return;
    try {
        await sb.from('app_config').upsert({ config_key: 'PopupMessage', config_value: msg, updated_at: new Date() }, { onConflict: 'config_key' });
        alert('Popup message saved!');
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function clearPopupMsg() {
    try {
        await sb.from('app_config').delete().eq('config_key', 'PopupMessage');
        document.getElementById('popupMsgInput').value = '';
        alert('Popup message cleared!');
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function processUploads() {
    const types = ['Weekday', 'Saturday', 'Sunday', 'Special'];
    for (const type of types) {
        const fileInput = document.getElementById('f_' + type);
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const text = await file.text();
            const rows = parseCSV(text);
            if (rows.length > 0) {
                const tripRows = rows.map(row => ({
                    day_type: type,
                    duty_no: row[0] || '',
                    sign_on_time: row[1] || '',
                    sign_on_loc: row[2] || '',
                    sign_off_loc: row[3] || '',
                    sign_off_time: row[4] || '',
                    running_time: row[5] || '',
                    duty_remarks: row[6] || '',
                    rake_id: row[8] || '',
                    dep_loc: row[9] || '',
                    dep_time: row[10] || '',
                    arr_loc: row[11] || '',
                    arr_time: row[12] || '',
                    additional_remarks: row[13] || ''
                }));
                await sb.from('trip_data').delete().eq('day_type', type);
                await sb.from('trip_data').insert(tripRows);
                alert(type + ' data uploaded!');
            }
        }
    }
}

function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    return lines.map(line => {
        const row = [];
        let inQuotes = false;
        let current = '';
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') {
                inQuotes = !inQuotes;
            } else if (line[i] === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += line[i];
            }
        }
        row.push(current.trim());
        return row;
    }).filter(row => row.some(cell => cell !== ''));
}

async function clearData(type) {
    if (!confirm('Clear ' + type + ' data?')) return;
    try {
        await sb.from('trip_data').delete().eq('day_type', type);
        alert(type + ' data cleared!');
    } catch (e) { alert('Error: ' + e.toString()); }
}

function updateAdminUI(accessLevel) {
    const adminTabs = document.querySelectorAll('.admin-only-tab');
    const usersTab = document.getElementById('tabUsers');
    if (accessLevel === 'admin') {
        adminTabs.forEach(tab => tab.style.display = 'inline-block');
        if (usersTab) usersTab.style.display = 'inline-block';
    } else {
        adminTabs.forEach(tab => tab.style.display = 'none');
        if (usersTab) usersTab.style.display = 'none';
    }
}

function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
    const tabContent = document.getElementById('adminTab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (tabContent) tabContent.style.display = 'block';
    if (tab === 'users') loadUserLists();
    if (tab === 'chart') initSeriesGrid();
}

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-GB');
    document.getElementById('currentDay').textContent = now.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
    
    try {
        const { data: popup } = await sb.from('app_config').select('config_value').eq('config_key', 'PopupMessage').single();
        if (popup && popup.config_value) {
            document.getElementById('popupMessageText').textContent = popup.config_value;
            document.getElementById('popupOverlay').classList.add('show');
        }
        
        const { data: userMsg } = await sb.from('app_config').select('config_value').eq('config_key', 'UserMessage').single();
        if (userMsg && userMsg.config_value) {
            document.getElementById('userMsgText').textContent = userMsg.config_value;
            document.getElementById('userMsgBanner').style.display = 'flex';
        }
    } catch (e) {}
});

// CHART FUNCTIONS
let myChart = null;

async function getGraphData(type, seriesArray, customDuties) {
    try {
        const { data, error } = await sb.from('trip_data').select('*').eq('day_type', type).order('id', { ascending: true });
        if (error || !data || data.length === 0) return { error: 'No data in ' + type };
        
        const chartData = [];
        let totalMinutes = 0;
        const seenDuties = {};
        
        for (let i = 0; i < data.length; i++) {
            const d = (data[i].duty_no || '').toString().trim();
            const isSeriesMatched = seriesArray.some(s => {
                if (s === '11-20') {
                    const num = parseInt(d);
                    return num >= 11 && num <= 20;
                }
                const num = parseInt(s);
                if (num >= 10) return d === s || d.startsWith(s + '-') || d.startsWith(s + '0');
                return d.startsWith(s);
            });
            const isCustomMatched = customDuties && customDuties.length > 0 && customDuties.indexOf(d) !== -1;
            
            if ((isSeriesMatched || isCustomMatched) && d !== '') {
                if (seenDuties[d]) continue;
                const timeStr = (data[i].running_time || '').toString().trim();
                if (timeStr === '' || timeStr.indexOf(':') === -1) continue;
                const p = timeStr.split(':');
                const mins = (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
                seenDuties[d] = true;
                chartData.push({ 
                    duty: d, 
                    running: mins / 60, 
                    runningStr: timeStr, 
                    dutyStr: (data[i].duty_remarks || '').toString(), 
                    signOnLoc: (data[i].sign_on_loc || '').toString(), 
                    signOnTime: (data[i].sign_on_time || '').toString(), 
                    signOffLoc: (data[i].sign_off_loc || '').toString(), 
                    signOffTime: (data[i].sign_off_time || '').toString() 
                });
                totalMinutes += mins;
            }
        }
        
        if (!chartData.length) return { error: 'No duties found.' };
        const avgMins = totalMinutes / chartData.length;
        const avgHrs = Math.floor(avgMins / 60);
        const remMins = Math.round(avgMins % 60);
        const avgStr = avgHrs.toString().padStart(2, '0') + ':' + remMins.toString().padStart(2, '0');
        return { details: chartData, avgTime: avgStr, day: type };
    } catch (e) { return { error: e.toString() }; }
}

async function generateGraph() {
    const dayType = document.getElementById('graphDay').value;
    const series = Array.from(document.querySelectorAll('input[name="series"]:checked')).map(cb => cb.value);
    const customDuties = document.getElementById('customDutiesGraph').value.split(',').map(d => d.trim()).filter(d => d);
    const result = await getGraphData(dayType, series, customDuties);
    if (result.error) { alert(result.error); return; }
    
    document.getElementById('graphWrapper').style.display = 'block';
    document.getElementById('chartTitle').textContent = dayType + ' - Running Time Analysis';
    document.getElementById('avgDisplay').textContent = 'AVG: ' + result.avgTime;
    
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: result.details.map(d => d.duty),
            datasets: [{ label: 'Running Time (hrs)', data: result.details.map(d => d.running), backgroundColor: 'rgba(0, 212, 255, 0.6)', borderColor: 'rgba(0, 212, 255, 1)', borderWidth: 1 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } }, x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.1)' } } },
            plugins: { legend: { labels: { color: '#fff' } } }
        }
    });
}

function downloadChartPDF() {
    const chartParent = document.getElementById('chartParent');
    html2canvas(chartParent).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'chart.png';
        link.href = imgData;
        link.click();
    });
}

function downloadChartExcel() {
    const dayType = document.getElementById('graphDay').value;
    const series = Array.from(document.querySelectorAll('input[name="series"]:checked')).map(cb => cb.value);
    const customDuties = document.getElementById('customDutiesGraph').value.split(',').map(d => d.trim()).filter(d => d);
    getGraphData(dayType, series, customDuties).then(result => {
        if (result.error) return;
        const wsData = [['Duty', 'Running Time', 'Sign On Loc', 'Sign On Time', 'Sign Off Loc', 'Sign Off Time']];
        result.details.forEach(d => { wsData.push([d.duty, d.runningStr, d.signOnLoc, d.signOnTime, d.signOffLoc, d.signOffTime]); });
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
        XLSX.writeFile(wb, 'chart_data.xlsx');
    });
}

// VISITOR STATS
async function logVisit(page, type, empId) {
    try {
        await sb.from('visitor_logs').insert({ page: page, type: type, emp_id: empId || 'Organic', user_agent: navigator.userAgent ? navigator.userAgent.substring(0, 100) : 'Unknown', timestamp: new Date() });
    } catch (e) {}
}

async function getVisitorStats() {
    try {
        const { data, error } = await sb.from('visitor_logs').select('*');
        if (error || !data) return { totalVisits: 0, organic: 0, loggedIn: 0, today: 0, thisWeek: 0 };
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        let total = data.length, organic = 0, loggedIn = 0, todayCount = 0, weekCount = 0;
        for (let i = 0; i < data.length; i++) {
            if (!data[i].emp_id || data[i].emp_id === 'Organic' || data[i].emp_id.trim() === '') organic++;
            else loggedIn++;
            if (data[i].timestamp) {
                const visitDate = new Date(data[i].timestamp);
                if (!isNaN(visitDate.getTime())) {
                    const visitDay = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());
                    if (visitDay.getTime() === today.getTime()) todayCount++;
                    if (visitDay >= weekAgo) weekCount++;
                }
            }
        }
        return { totalVisits: total, organic: organic, loggedIn: loggedIn, today: todayCount, thisWeek: weekCount };
    } catch (e) { return { totalVisits: 0, organic: 0, loggedIn: 0, today: 0, thisWeek: 0 }; }
}

async function loadVisitorStats() {
    const stats = await getVisitorStats();
    document.getElementById('visitTotal').textContent = stats.totalVisits;
    document.getElementById('visitOrganic').textContent = stats.organic;
    document.getElementById('visitLoggedIn').textContent = stats.loggedIn;
    document.getElementById('visitToday').textContent = stats.today;
    document.getElementById('visitWeek').textContent = stats.thisWeek;
}

function downloadVisitorLog() { alert('Export functionality - to be implemented with XLSX library'); }

async function clearVisitorLog() {
    if (!confirm('Clear all visitor logs?')) return;
    try { await sb.from('visitor_logs').delete().neq('id', 0); alert('Visitor log cleared!'); loadVisitorStats(); } catch (e) { alert('Error: ' + e.toString()); }
}

function openUserForm() { alert('User form - to be implemented with Form Builder data'); }

async function generateKmReport() {
    const dayType = document.getElementById('graphDay')?.value || 'Weekday';
    try {
        const { data, error } = await sb.from('trip_data').select('*').eq('day_type', dayType).order('id', { ascending: true });
        if (error || !data || data.length === 0) { alert('No data found for ' + dayType); return; }
        
        let totalKm = 0, tripCount = 0;
        const rakeKm = {};
        for (let i = 0; i < data.length; i++) {
            const r = data[i];
            if (r.rake_id && r.rake_id.toString().trim() !== '') {
                const from = (r.dep_loc || '').toString().trim().toUpperCase();
                const to = (r.arr_loc || '').toString().trim().toUpperCase();
                const km = KM_MAP[from + '|' + to] || 0;
                totalKm += km;
                tripCount++;
                if (!rakeKm[r.rake_id]) rakeKm[r.rake_id] = 0;
                rakeKm[r.rake_id] += km;
            }
        }
        
        let html = '<div class="glass-card" style="padding:15px;margin-bottom:15px;">' +
            '<h4 style="color:var(--green);margin-bottom:10px;">' + dayType + ' - KM Summary</h4>' +
            '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:15px;">' +
            '<div style="text-align:center;background:rgba(0,212,255,0.1);padding:10px;border-radius:8px;"><div style="font-size:10px;color:rgba(255,255,255,0.6);">TOTAL KM</div><div style="font-size:20px;color:var(--cyan);font-weight:bold;">' + totalKm.toFixed(2) + '</div></div>' +
            '<div style="text-align:center;background:rgba(34,197,94,0.1);padding:10px;border-radius:8px;"><div style="font-size:10px;color:rgba(255,255,255,0.6);">TRIPS</div><div style="font-size:20px;color:var(--green);font-weight:bold;">' + tripCount + '</div></div>' +
            '<div style="text-align:center;background:rgba(168,85,247,0.1);padding:10px;border-radius:8px;"><div style="font-size:10px;color:rgba(255,255,255,0.6);">RAKES</div><div style="font-size:20px;color:var(--purple);font-weight:bold;">' + Object.keys(rakeKm).length + '</div></div>' +
            '</div>';
        
        html += '<div class="table-wrap"><table class="data-table"><tr><th>Rake ID</th><th>Total KM</th></tr>';
        for (const rake in rakeKm) {
            html += '<tr><td>' + rake + '</td><td><span class="km-tag">' + rakeKm[rake].toFixed(2) + ' km</span></td></tr>';
        }
        html += '</table></div></div>';
        document.getElementById('kmReportContent').innerHTML = html;
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function generateTetraKey() {
    const dayType = document.getElementById('tetraDayType').value;
    try {
        const { data, error } = await sb.from('trip_data').select('*').eq('day_type', dayType).order('id', { ascending: true });
        if (error || !data || data.length === 0) { alert('No data found for ' + dayType); return; }
        
        const rakeTrips = {};
        for (let i = 0; i < data.length; i++) {
            const rake = (data[i].rake_id || '').toString().trim();
            if (!rake) continue;
            if (!rakeTrips[rake]) rakeTrips[rake] = [];
            rakeTrips[rake].push({
                duty: data[i].duty_no,
                depTime: data[i].dep_time,
                arrTime: data[i].arr_time,
                boardStn: (data[i].dep_loc || '').toString().trim().toUpperCase(),
                alightStn: (data[i].arr_loc || '').toString().trim().toUpperCase()
            });
        }
        
        let html = '<div class="table-wrap"><table class="data-table"><tr><th>Rake</th><th>Duty</th><th>Board Stn</th><th>Board Time</th><th>Alight Stn</th><th>Alight Time</th><th>Action</th></tr>';
        for (const rake in rakeTrips) {
            const trips = rakeTrips[rake];
            trips.sort((a, b) => timeToMins(a.depTime) - timeToMins(b.depTime));
            trips.forEach((t, idx) => {
                html += '<tr>' +
                    '<td>' + rake + '</td>' +
                    '<td>' + (t.duty || '') + '</td>' +
                    '<td>' + (idx === 0 ? t.boardStn : '') + '</td>' +
                    '<td>' + (idx === 0 ? t.depTime : '') + '</td>' +
                    '<td>' + (idx === trips.length - 1 ? t.alightStn : '') + '</td>' +
                    '<td>' + (idx === trips.length - 1 ? t.arrTime : '') + '</td>' +
                    '<td>' + (idx === 0 ? 'BOARD' : idx === trips.length - 1 ? 'ALIGHT' : '') + '</td>' +
                '</tr>';
            });
        }
        html += '</table></div>';
        document.getElementById('tetraKeyOutput').innerHTML = html;
    } catch (e) { alert('Error: ' + e.toString()); }
}

// Form Builder
function addFormField() {
    const container = document.getElementById('formFieldsList');
    const idx = container.children.length;
    const fieldHtml = '<div class="glass-card" style="padding:10px;margin-bottom:8px;background:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.3);">' +
        '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
            '<input type="text" placeholder="Field Name" class="jarvis-input" style="font-size:11px;padding:6px;flex:1;" id="fieldName' + idx + '">' +
            '<select class="jarvis-select" style="width:auto;padding:6px;font-size:11px;" id="fieldType' + idx + '">' +
                '<option value="text">Text</option>' +
                '<option value="number">Number</option>' +
                '<option value="select">Dropdown</option>' +
                '<option value="checkbox">Checkbox</option>' +
            '</select>' +
            '<label style="font-size:11px;display:flex;align-items:center;gap:4px;"><input type="checkbox" id="fieldReq' + idx + '"> Required</label>' +
        '</div>' +
        '<input type="text" placeholder="Options (comma-separated for dropdown)" class="jarvis-input" style="font-size:11px;padding:6px;" id="fieldOpts' + idx + '">' +
    '</div>';
    container.insertAdjacentHTML('beforeend', fieldHtml);
}

async function saveFormFields() {
    const heading = document.getElementById('formHeading').value;
    const fields = [];
    const container = document.getElementById('formFieldsList');
    for (let i = 0; i < container.children.length; i++) {
        const name = document.getElementById('fieldName' + i)?.value;
        if (!name) continue;
        fields.push({
            name: name,
            type: document.getElementById('fieldType' + i)?.value || 'text',
            required: document.getElementById('fieldReq' + i)?.checked || false,
            options: document.getElementById('fieldOpts' + i)?.value || ''
        });
    }
    alert('Form "' + heading + '" saved with ' + fields.length + ' fields! (Needs Supabase integration)');
}

// User Management
async function loadUserLists() {
    try {
        const { data: profiles } = await sb.from('profiles').select('*');
        let html = '<table class="data-table"><tr><th>Emp ID</th><th>Name</th><th>Level</th></tr>';
        (profiles || []).forEach(p => {
            html += '<tr><td>' + p.emp_id + '</td><td>' + p.full_name + '</td><td>' + p.access_level + '</td></tr>';
        });
        html += '</table>';
        document.getElementById('registeredUsersList').innerHTML = html;
        
        document.getElementById('adminIdsList').innerHTML = '<div style="color:rgba(255,255,255,0.6);font-size:11px;">Main Admin: 3623</div>';
        document.getElementById('ccIdsList').innerHTML = '<div style="color:rgba(255,255,255,0.6);font-size:11px;">Configure in Supabase</div>';
    } catch (e) {}
}

function addAdminId() { alert('Add Admin ID - needs Supabase integration'); }
function addCcId() { alert('Add CC ID - needs Supabase integration'); }

// Initialize series grid
function initSeriesGrid() {
    const grid = document.getElementById('seriesGrid');
    if (!grid) return;
    const series = ['1','2','3','4','5','6','7','8','9','10','11-20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40'];
    grid.innerHTML = series.map(s => '<label><input type="checkbox" name="series" value="' + s + '"> ' + s + '</label>').join('');
}

function toggleLoginModal() {
    const m = document.getElementById('loginModal');
    m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
}

async function handleLogin() {
    const eid = document.getElementById('loginEmpId').value;
    const pwd = document.getElementById('loginPassword').value;
    const err = document.getElementById('loginError');
    let hash = 0;
    for (let i = 0; i < pwd.length; i++) {
        hash = ((hash << 5) - hash) + pwd.charCodeAt(i);
        hash = hash & hash;
    }
    try {
        const { data, error } = await sb.from('profiles').select('*').eq('emp_id', eid.toUpperCase());
        if (error) {
            console.error('Login error:', error);
            err.textContent = 'Database error: ' + error.message;
            err.style.display = 'block';
            return;
        }
        if (!data || data.length === 0) {
            err.textContent = 'Invalid credentials!';
            err.style.display = 'block';
            return;
        }
        const userData = data[0];
        if (userData.password_hash === hash.toString()) {
            currentUser = { empId: userData.emp_id, name: userData.full_name, accessLevel: userData.access_level };
            document.getElementById('loggedInUserHeader').classList.add('show');
            document.getElementById('headerUserName').textContent = userData.full_name;
            document.getElementById('headerUserId').textContent = userData.emp_id;
            toggleLoginModal();
            // Navigate to admin page
            showPage('pageAdmin');
            // Show admin tabs if admin
            if (userData.access_level === 'admin') {
                document.querySelectorAll('.admin-only-tab').forEach(tab => tab.style.display = 'inline-block');
                document.getElementById('tabUsers').style.display = 'inline-block';
            }
            // Update admin info
            document.getElementById('adminLoggedEmpId').textContent = userData.emp_id;
            document.getElementById('adminLoggedLevel').textContent = userData.access_level;
        } else {
            err.textContent = 'Invalid credentials!';
            err.style.display = 'block';
        }
    } catch(e) {
        err.textContent = 'Error: ' + e.toString();
        err.style.display = 'block';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-GB');
    document.getElementById('currentDay').textContent = now.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
});
