// CONFIG
const SUPABASE_URL = 'https://yqywoqtrbaydxatxatxq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeXdvcXRyYmF5ZHhhdHhhdHhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3ODkyNTIsImV4cCI6MjA5MzM2NTI1Mn0.1fVzJTQS6lx4tW6a2hmAbRIThwF-qrsewHcRpEY0b2Y';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let adminClicks = 0;

// KM MAP (hardcoded defaults)
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
    "IPE|MUPR UP": 10.4,
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
    "MUPR UP|KKDA UP": 7.3,
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
    "PBGW DN|DDSC": 11.86,
    "PBGW UP|KKDA UP": 29.10,
    "PBGW UP|MUPR": 21.79,
    "PBGW UP|MKPR": 8.43,
    "SAKP 3RD|PBGW DN": 1.84,
    "SVVR DN|KKDA UP": 11.91,
    "SVVR DN SDG|MUPR DN": 4.8,
    "SVVR DN PF|KKDA UP": 11.91,
    "SVVR DN PF STABLE|KKDA UP": 11.91,
    "SVVR DN|SVVR DN SDG STABLE": 0.4,
    "SVVR DN|SVVR DN SDG": 0.4,
    "SVVR DN PF|SVVR DN SDG STABLE": 0.4,
    "SVVR DN PF|SVVR DN SDG": 0.4,
    "SVVR DN SDG|MUPR": 4,
    "SVVR DN SDG STABLE|MUPR": 4
};
let kmData = {};

async function loadKmData() {
    try {
        const { data } = await sb.from('app_config').select('config_value').eq('config_key', 'km_data').single();
        if (data && data.config_value) {
            const uploaded = JSON.parse(data.config_value);
            kmData = { ...KM_MAP, ...uploaded };
        } else {
            kmData = { ...KM_MAP };
        }
    } catch (e) {
        kmData = { ...KM_MAP };
    }
    const el = document.getElementById('kmRouteCount');
    if (el) el.textContent = Object.keys(kmData).length;
}

function downloadKmCsv() {
    const rows = Object.entries(kmData).map(([route, km]) => route + ',' + km);
    const csv = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'km_data.csv';
    link.click();
    URL.revokeObjectURL(link.href);
}

async function uploadKmCsv() {
    const fi = document.getElementById('kmCsvFile');
    const file = fi?.files?.[0];
    if (!file) return alert('Select a CSV file!');
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const map = {};
    for (const line of lines) {
        const parts = line.split(',');
        if (parts.length < 2) continue;
        const route = parts[0].trim().toUpperCase();
        const km = parseFloat(parts[1].trim());
        if (route && !isNaN(km)) map[route] = km;
    }
    if (Object.keys(map).length === 0) return alert('No valid data found in CSV!');
    await sb.from('app_config').upsert(
        { config_key: 'km_data', config_value: JSON.stringify(map), updated_at: new Date().toISOString() },
        { onConflict: 'config_key' }
    );
    await loadKmData();
    alert('Uploaded ' + Object.keys(map).length + ' routes!');
    fi.value = '';
}

async function resetKmData() {
    if (!confirm('Reset KM data to hardcoded defaults?')) return;
    await sb.from('app_config').upsert(
        { config_key: 'km_data', config_value: '{}', updated_at: new Date().toISOString() },
        { onConflict: 'config_key' }
    );
    await loadKmData();
    alert('Reset to ' + Object.keys(kmData).length + ' default routes.');
}
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        page.classList.add('cinematic-enter');
        setTimeout(() => page.classList.remove('cinematic-enter'), 800);
    }
    // Clear Tetra Dashboard auto-refresh if leaving
    if (pageId !== 'pageTetraDashboard' && tetraDashAutoInterval) {
        clearInterval(tetraDashAutoInterval);
        tetraDashAutoInterval = null;
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
            const rawCell = data[j]["Duty No"];
            const cellValue = (rawCell || '').toString().trim().toLowerCase().replace('.0', '');
            
            if (cellValue === searchDuty && cellValue !== '') {
                found = true;
                roster.push(data[j]);
            } else if (found && (rawCell === '' || rawCell === undefined || rawCell === null)) {
                if (data[j]["Rake Num"] || data[j]["Start Stn"]) roster.push(data[j]);
                else if (data[j]["Duty No"] === '' && Object.values(data[j]).filter(v => v).length < 3) break;
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
            if (r["Rake Num"] && r["Rake Num"].toString().trim() !== '') {
                const from = (r["Start Stn"] || '').toString().trim().toUpperCase();
                const to = (r["End Stn"] || '').toString().trim().toUpperCase();
                kmValue = kmData[from + '|' + to] || 0;
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
            const rake = (tripData[i]["Rake Num"] || '').toString().trim();
            if (!rake) continue;
            if (!rakeTrips[rake]) rakeTrips[rake] = [];
            rakeTrips[rake].push({
                duty: tripData[i]["Duty No"],
                depTime: tripData[i]["Start Time"],
                arrTime: tripData[i]["End Time"],
                arrLoc: (tripData[i]["End Stn"] || '').toString().trim().toUpperCase(),
                depLoc: (tripData[i]["Start Stn"] || '').toString().trim().toUpperCase(),
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
    
    let h = `<div class="result-card cinematic-enter">
                <div style="text-align:center; padding-bottom:20px; border-bottom:1px solid rgba(0,212,255,0.2); margin-bottom:20px;">
                    <div style="font-family:'Syncopate'; font-size:clamp(32px,8vw,56px); font-weight:700; background:linear-gradient(90deg,var(--cyan),var(--orange)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">DUTY ${dutyNo}</div>
                    <div style="font-size:14px; letter-spacing:4px; color:rgba(255,255,255,0.7); text-transform:uppercase; margin-top:8px;">${dayType} Roster</div>
                </div>
                
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:10px; background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(168,85,247,0.1)); border:1px solid rgba(0,212,255,0.2); border-radius:12px; padding:15px;">
                    <div style="text-align:center;"><div style="font-size:9px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">WEF</div><div style="font-family:'Syncopate';font-size:13px;color:var(--cyan);">${data.wef || 'N/A'}</div></div>
                    <div style="text-align:center;"><div style="font-size:9px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Remarks</div><div style="font-family:'Syncopate';font-size:13px;color:var(--orange);">${data.remarks || 'None'}</div></div>
                    <div style="text-align:center;"><div style="font-size:9px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Type</div><div style="font-family:'Syncopate';font-size:13px;color:var(--purple);">${dayType}</div></div>
                </div>
             </div>`;
    
    h += `<div class="result-card cinematic-enter" style="animation-delay:0.1s;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;padding:10px 15px;background:linear-gradient(135deg,rgba(0,212,255,0.2),rgba(168,85,247,0.15));border-radius:10px;border-left:4px solid var(--cyan);">
                <span style="font-size:18px;">🚇</span><span style="font-family:'Syncopate';font-size:13px;text-transform:uppercase;letter-spacing:2px;">Sign On / Off</span>
            </div>
            <div class="table-wrap">
            <table class="data-table">
                <tr><th>Action</th><th>Location</th><th>Time</th></tr>
                <tr style="background:rgba(34,197,94,0.15);"><td style="color:var(--green);font-weight:700;">SIGN ON</td><td>${firstRow["Sign On Loc"] || '-'}</td><td><span class="time-display">${firstRow["Sign On Time"] || '-'}</span></td></tr>
                <tr style="background:rgba(255,107,53,0.15);"><td style="color:var(--orange);font-weight:700;">SIGN OFF</td><td>${firstRow["Sign Off Loc"] || '-'}</td><td><span class="time-display">${firstRow["Sign Off Time"] || '-'}</span></td></tr>
            </table>
            </div>
           </div>`;
    
    h += `<div class="result-card cinematic-enter" style="animation-delay:0.2s;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;padding:10px 15px;background:linear-gradient(135deg,rgba(0,212,255,0.2),rgba(168,85,247,0.15));border-radius:10px;border-left:4px solid var(--cyan);">
                <span style="font-size:18px;">🚄</span><span style="font-family:'Syncopate';font-size:13px;text-transform:uppercase;letter-spacing:2px;">Trip Details</span>
            </div>
            <div class="table-wrap">
            <table class="data-table">
                <tr><th>Reliever</th><th>Rake</th><th>From</th><th>Dep</th><th>To</th><th>Arr</th><th>KM</th><th>Reliever</th></tr>`;
    
    data.roster.forEach(r => {
        if (r["Rake Num"] && r["Rake Num"].toString().trim() !== '') {
            let km = r.calculated_km || 0;
            let rakeId = r["Rake Num"].toString().trim();
            let depTime = (r["Start Time"] || "").toString().trim();
            let arrTime = (r["End Time"] || "").toString().trim();
            
            let gapBefore = "";
            let gapAfter = "";
            
            if (data.rakeGaps) {
                let gapKeyDep = rakeId + '|' + depTime;
                if (data.rakeGaps[gapKeyDep]) {
                    gapBefore = '<span style="background:#ff0040;color:#fff;padding:3px 8px;border-radius:4px;font-weight:700;margin-right:5px;animation:flashTetra 1s infinite;" title="Take Tetra Key Set">🔑 TETRA KEY</span>';
                }
                let gapKeyArr = rakeId + '|' + arrTime;
                if (data.rakeGaps[gapKeyArr]) {
                    gapAfter = '<span style="background:#ff0040;color:#fff;padding:3px 8px;border-radius:4px;font-weight:700;margin-left:5px;animation:flashTetra 1s infinite;" title="Take Tetra Key Set">🔑 TETRA KEY</span>';
                }
            }
            
            h += `<tr>
                <td>${gapBefore}</td>
                <td style="color:var(--cyan);font-weight:700;">${r["Rake Num"]}</td>
                <td>${r["Start Stn"]}</td>
                <td>${r["Start Time"]}</td>
                <td>${r["End Stn"]}</td>
                <td>${r["End Time"]}</td>
                <td><span class="km-tag">${km} km</span></td>
                <td>${gapAfter}</td>
            </tr>`;
        }
    });
    h += `</table></div></div>`;
    
    h += `<div class="result-card cinematic-enter" style="animation-delay:0.3s;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;padding:10px 15px;background:linear-gradient(135deg,rgba(255,107,53,0.2),rgba(200,85,0,0.1));border-radius:10px;border-left:4px solid var(--orange);">
                <span style="font-size:18px;">☕</span><span style="font-family:'Syncopate';font-size:13px;text-transform:uppercase;letter-spacing:2px;">Break Schedule</span>
            </div>
            <div class="table-wrap">
            <table class="data-table">
                <tr><th>Relief Point</th><th>Start</th><th>Duration</th></tr>`;
    
    let hb = false;
    data.roster.forEach(r => {
        let breakVal = parseFloat(r["Break"] || 0);
        if (breakVal > 0) {
            hb = true;
            h += `<tr><td>${r["End Stn"]}</td><td>${r["End Time"]}</td><td style="color:var(--orange);font-weight:700;">${breakVal}m</td></tr>`;
        }
    });
    if (!hb) h += `<tr><td colspan="3" style="color:rgba(255,255,255,0.4);font-style:italic;">No scheduled breaks</td></tr>`;
    h += `</table></div></div>`;
    
    h += `<div class="result-card cinematic-enter" style="animation-delay:0.4s;">
            <div class="summary-grid" style="margin:0;">
                <div class="summary-box"><div class="label">Driving</div><div class="value cyan">${firstRow["Driving Hrs"] || '-'}</div></div>
                <div class="summary-box"><div class="label">Total Hrs</div><div class="value orange">${firstRow["Duty Hrs"] || '-'}</div></div>
                <div class="summary-box"><div class="label">Total KM</div><div class="value green">${data.totalKm} km</div></div>
            </div>
           </div>`;
    
    container.innerHTML = h;
    document.getElementById('dutyInputQuick').value = "";
}

async function fetchDuty(source) {
    const dutyNo = source === 'home' ? document.getElementById('dutyInputHome').value : document.getElementById('dutyInputQuick').value;
    const dayType = document.getElementById('daySelect').value;
    if (!dutyNo) { alert('Please enter a duty number'); return; }
    trackVisit('duty_search', 'search');
    const result = await getDutyData(dayType, dutyNo);
    if (result.error) { alert(result.error); return; }
    displayResult(result, dutyNo, dayType);
    if (source === 'home') showPage('pageResult');
}

function toggleRegisterModal() {
    const regModal = document.getElementById('registerModal');
    if (regModal.style.display === 'flex') {
        regModal.style.display = 'none';
    } else {
        regModal.style.display = 'flex';
        document.getElementById('regName').value = '';
        document.getElementById('regEmpId').value = '';
        document.getElementById('regAccessCode').value = '';
        document.getElementById('regPassword').value = '';
        document.getElementById('regConfirmPassword').value = '';
        const err = document.getElementById('registerError');
        const success = document.getElementById('registerSuccess');
        if (err) err.style.display = 'none';
        if (success) success.style.display = 'none';
        setTimeout(() => document.getElementById('regName').focus(), 100);
    }
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

async function handleRegister() {
    const name = document.getElementById('regName').value;
    const empId = document.getElementById('regEmpId').value;
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
    
    try {
        const { data: existing } = await sb.from('profiles').select('*').eq('emp_id', normalizedId);
        if (existing && existing.length > 0 && existing[0].password_hash) {
            errorDiv.textContent = 'Emp ID already registered! Please login.';
            errorDiv.style.display = 'block';
            return;
        }
        const pendingList = await loadAppConfigList('pending_registrations');
        let pending = pendingList.find(p => p.emp_id === normalizedId);
        let accessLevel = pending ? pending.access_level : null;
        if (!accessLevel && existing && existing.length > 0) {
            accessLevel = existing[0].access_level;
        }
        if (!accessLevel) {
            errorDiv.textContent = 'Not authorized! Contact admin to add your Emp ID first.';
            errorDiv.style.display = 'block';
            return;
        }
        
        const passwordHash = hashPassword(password);
        
        const profilePayload = {
            emp_id: normalizedId,
            full_name: name,
            access_level: accessLevel,
            password_hash: passwordHash,
            created_at: new Date().toISOString()
        };
        
        if (existing && existing.length > 0) {
            await sb.from('profiles').update(profilePayload).eq('emp_id', normalizedId);
        } else {
            const { error: insErr } = await sb.from('profiles').insert(profilePayload);
            if (insErr && insErr.message && insErr.message.includes('duplicate key')) {
                await sb.from('profiles').update(profilePayload).eq('emp_id', normalizedId);
            }
        }
        
        if (pending) {
            const updatedPending = pendingList.filter(p => p.emp_id !== normalizedId);
            await saveAppConfigList('pending_registrations', updatedPending);
        }
        
        currentUser = {
            empId: normalizedId,
            name: name,
            accessLevel: accessLevel
        };
        updateUserHeader();
        
        successDiv.textContent = 'Registration successful!';
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        setTimeout(() => {
            toggleRegisterModal();
            showPage('pageAdmin');
            loadAdminData();
        }, 1500);
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
    const types = ['Weekday', 'Saturday', 'Sunday', 'Special', 'Test'];
    for (const type of types) {
        const fileInput = document.getElementById('f_' + type);
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const text = await file.text();
            const rows = parseCSV(text);
            if (rows.length > 0) {
                  const tripRows = rows.map(row => ({
                      day_type: type,
                      "Duty No": row[0] || '',
                      "Sign On Time": row[1] || '',
                      "Sign On Loc": row[2] || '',
                      "Sign Off Loc": row[3] || '',
                      "Sign Off Time": row[4] || '',
                      "Driving Hrs": row[5] || '',
                      "Duty Hrs": row[6] || '',
                      "Same Jurisdiction": row[7] || '',
                      "Rake Num": row[8] || '',
                      "Start Stn": row[9] || '',
                      "Start Time": row[10] || '',
                      "End Stn": row[11] || '',
                      "End Time": row[12] || '',
                      "Service Duration": row[13] || '',
                      "Break": row[14] || '',
                      "StepBack Rake": row[15] || ''
                  }));
                await sb.from('trip_data').delete().eq('day_type', type);
                await sb.from('trip_data').insert(tripRows);
                // Save WEF and Remarks
                const wef = (document.getElementById('wef_' + type)?.value || '').trim();
                const remarks = (document.getElementById('rem_' + type)?.value || '').trim();
                const keys = [type + '_wef', type + '_remarks'];
                await sb.from('app_config').delete().in('config_key', keys);
                if (wef) await sb.from('app_config').insert({ config_key: type + '_wef', config_value: wef });
                if (remarks) await sb.from('app_config').insert({ config_key: type + '_remarks', config_value: remarks });
                alert(type + ' data uploaded!');
            }
        }
    }
}

function parseCSV(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    // Skip the first line (header row)
    return lines.slice(1).map(line => {
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
    }).filter(row => row.some(cell => cell !== '') && row[8] !== '');
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

function switchAdminTab(tabName) {
    const isAdmin = currentUser && currentUser.accessLevel && currentUser.accessLevel.toLowerCase() === 'admin';
    const restrictedTabs = ['messages', 'upload', 'users', 'form'];
    if (!isAdmin && restrictedTabs.indexOf(tabName) !== -1) {
        alert('Admin access required for this section!');
        return;
    }
    document.querySelectorAll('.admin-tab-content').forEach(t => t.style.display = 'none');
    const tabContent = document.getElementById('adminTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (tabContent) tabContent.style.display = 'block';
    if (tabName === 'messages') loadVisitorStats();
    if (tabName === 'upload') loadKmData();
    if (tabName === 'users') loadUserManagementData();
    if (tabName === 'chart') initSeriesGrid();
}

// SESSION MANAGEMENT
function saveSession(user) {
    currentUser = user;
    sessionStorage.setItem('dmrcUser', JSON.stringify(user));
    updateUserHeader();
}

function checkExistingSession() {
    const savedUser = sessionStorage.getItem('dmrcUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateUserHeader();
            loadUserMessages();
        } catch(e) {
            sessionStorage.removeItem('dmrcUser');
        }
    }
}

function updateUserHeader() {
    const headerBar = document.getElementById('loggedInUserHeader');
    if (!headerBar) return;
    if (currentUser) {
        document.getElementById('headerUserName').textContent = currentUser.name;
        document.getElementById('headerUserId').textContent = currentUser.empId;
        const currentPage = document.querySelector('.page.active');
        if (currentPage && (currentPage.id === 'pageAdmin')) {
            headerBar.classList.add('show');
        } else {
            headerBar.classList.remove('show');
        }
    } else {
        headerBar.classList.remove('show');
    }
    // Update login/logout button
    const loginBtn = document.getElementById('minimalLoginText');
    if (loginBtn) loginBtn.textContent = currentUser ? '👤 LOGOUT' : '👤 LOGIN';
    // Show/hide admin-only elements
    const isAdmin = currentUser && currentUser.accessLevel && currentUser.accessLevel.toLowerCase() === 'admin';
    document.querySelectorAll('.admin-only-upload-row, .admin-only-day').forEach(el => el.style.display = isAdmin ? '' : 'none');
}

function togglePasswordVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = '🙈';
    } else {
        input.type = 'password';
        icon.textContent = '👁️';
    }
}

// Login/Logout button
document.addEventListener('click', function(e) {
    if (e.target.id === 'minimalLoginTrigger' || e.target.closest('#minimalLoginTrigger')) {
        if (currentUser) {
            handleLogout();
        } else {
            toggleLoginModal();
        }
    }
});

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        if (currentUser && currentUser.accessLevel && currentUser.accessLevel.toLowerCase() === 'admin') {
            showPage('pageAdmin');
            loadAdminData();
        } else {
            toggleLoginModal();
        }
    }
});

function adminLogin() {
    toggleLoginModal();
}

// UPDATE DATE/TIME
function updateDateTime() {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    document.getElementById('currentDate').textContent = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
    document.getElementById('currentDay').textContent = days[now.getDay()];
    const daySelect = document.getElementById('daySelect');
    if (daySelect) {
        if (now.getDay() === 0) daySelect.value = 'Sunday';
        else if (now.getDay() === 6) daySelect.value = 'Saturday';
        else daySelect.value = 'Weekday';
    }
}

// FORMAT TIME
function formatTime(h) {
    if (isNaN(h)) return "00:00";
    let hrs = Math.floor(h);
    let mins = Math.round((h - hrs) * 60);
    if (mins === 60) { hrs++; mins = 0; }
    return hrs.toString().padStart(2, '0') + ':' + mins.toString().padStart(2, '0');
}

// GET CUSTOM DUTIES
function getCustomDuties(inputId) {
    const val = document.getElementById(inputId)?.value;
    if (!val || !val.trim()) return [];
    return val.split(',').map(d => d.trim()).filter(d => d !== '');
}

// LOAD USER MESSAGES
async function loadUserMessages() {
    try {
        const { data } = await sb.from('app_config').select('config_value').eq('config_key', 'UserMessage').single();
        if (data && data.config_value) {
            document.getElementById('userMsgBanner').style.display = 'flex';
            document.getElementById('userMsgText').textContent = data.config_value;
        } else {
            document.getElementById('userMsgBanner').style.display = 'none';
        }
    } catch (e) {}
}

// LOAD POPUP MESSAGE
async function loadPopupMessage() {
    try {
        const { data } = await sb.from('app_config').select('config_value').eq('config_key', 'PopupMessage').single();
        if (data && data.config_value) {
            document.getElementById('popupMessageText').textContent = data.config_value;
            document.getElementById('popupOverlay').classList.add('show');
        }
    } catch (e) {}
}

// ADMIN DATA LOADER
async function loadAdminData() {
    const isAdmin = currentUser && currentUser.accessLevel && currentUser.accessLevel.toLowerCase() === 'admin';
    const isMainAdmin = currentUser && currentUser.empId === '3623';
    const adminOnlyTabs = document.querySelectorAll('.admin-only-tab');
    adminOnlyTabs.forEach(tab => { tab.style.display = isAdmin ? 'inline-block' : 'none'; });
    const usersTab = document.getElementById('tabUsers');
    if (usersTab) { usersTab.style.display = isAdmin ? 'inline-block' : 'none'; }
    const empIdSpan = document.getElementById('adminLoggedEmpId');
    const levelSpan = document.getElementById('adminLoggedLevel');
    if (empIdSpan) empIdSpan.textContent = currentUser ? currentUser.empId : 'Not logged in';
    if (levelSpan) levelSpan.textContent = currentUser ? currentUser.accessLevel : '-';
    if (isAdmin) {
        loadMessageLog();
        loadVisitorStats();
    }
    // Restrict "Admin" dropdown option to emp 3623 only
    ['newUserAccessLevel', 'removeUserAccessLevel'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const adminOpt = sel.querySelector('option[value="admin"]');
        if (adminOpt) adminOpt.style.display = isMainAdmin ? 'block' : 'none';
        if (!isMainAdmin && sel.value === 'admin') sel.value = 'crewcontroller';
    });
    loadUserManagementData();
    if (isAdmin) {
        switchAdminTab('messages');
    } else {
        switchAdminTab('chart');
    }
    // Load existing WEF/Remarks into upload form
    try {
        const { data: configData } = await sb.from('app_config').select('config_key, config_value');
        if (configData) {
            configData.forEach(c => {
                const el = document.getElementById(c.config_key);
                if (el) el.value = c.config_value;
            });
        }
    } catch (e) {}
}

// USER MANAGEMENT
async function loadAppConfigList(key) {
    const { data } = await sb.from('app_config').select('config_value').eq('config_key', key).single();
    return data ? JSON.parse(data.config_value || '[]') : [];
}
async function saveAppConfigList(key, list) {
    await sb.from('app_config').upsert({ config_key: key, config_value: JSON.stringify(list), updated_at: new Date().toISOString() }, { onConflict: 'config_key' });
}

async function loadUserManagementData() {
    try {
        const loggedSpan = document.getElementById('changePwdLoggedEmpId');
        if (loggedSpan && currentUser) loggedSpan.textContent = currentUser.empId + ' (' + currentUser.name + ')';
        
        const pendingList = await loadAppConfigList('pending_registrations');
        
        // Admin Access List: show pre-authorized admin emp IDs
        const adminIds = pendingList.filter(p => p.access_level === 'admin').map(p => p.emp_id);
        document.getElementById('adminAccessList').innerHTML = adminIds.length > 0 ? adminIds.join('<br>') : 'None';
        
        // Crew Controller Access List: show pre-authorized CC emp IDs
        const ccIds = pendingList.filter(p => p.access_level === 'crewcontroller').map(p => p.emp_id);
        document.getElementById('ccAccessList').innerHTML = ccIds.length > 0 ? ccIds.join('<br>') : 'None';
        
        // Registered Users: show profiles with password_hash
        const { data: profiles } = await sb.from('profiles').select('*');
        const tbody = document.getElementById('registeredUsersBody');
        if (!tbody) return;
        if (!profiles || profiles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,0.4);">No registered users</td></tr>';
        } else {
            tbody.innerHTML = '';
            profiles.forEach(p => {
                if (!p.password_hash) return;
                const tr = document.createElement('tr');
                tr.innerHTML = '<td style="color:var(--cyan);">' + p.emp_id + '</td>' +
                    '<td>' + (p.full_name || '-') + '</td>' +
                    '<td><span style="padding:2px 6px;border-radius:4px;font-size:9px;background:' + (p.access_level === 'admin' ? 'var(--red)' : 'var(--green)') + ';color:#000;">' + (p.access_level || 'crewcontroller') + '</span></td>' +
                    '<td>' + (p.created_at || '-') + '</td>';
                tbody.appendChild(tr);
            });
        }
        
        toggleSecretCode('new');
        toggleSecretCode('remove');
    } catch (e) { console.error('loadUserManagementData:', e); }
}

async function changePassword() {
    if (!currentUser) return alert('Not logged in!');
    const newPwd = document.getElementById('changePwdNew')?.value;
    if (!newPwd) return alert('Enter New Password!');
    if (newPwd.length < 6) return alert('Password must be at least 6 characters!');
    try {
        const hash = hashPassword(newPwd);
        await sb.from('profiles').update({ password_hash: hash }).eq('emp_id', currentUser.empId);
        alert('Password changed for ' + currentUser.empId);
        document.getElementById('changePwdNew').value = '';
    } catch (e) { alert('Error: ' + e.toString()); }
}

function toggleSecretCode(type) {
    const select = document.getElementById(type === 'new' ? 'newUserAccessLevel' : 'removeUserAccessLevel');
    const codeGroup = document.getElementById(type === 'new' ? 'newSecretCodeGroup' : 'removeSecretCodeGroup');
    if (codeGroup) {
        codeGroup.style.display = (select && select.value === 'admin') ? 'block' : 'none';
    }
}

async function addNewUserAccess() {
    const empId = document.getElementById('newUserEmpId')?.value?.trim()?.toUpperCase();
    const accessLevel = document.getElementById('newUserAccessLevel')?.value;
    const secretCode = document.getElementById('newSecretCode')?.value;
    if (!empId) return alert('Enter Emp ID!');
    if (accessLevel === 'admin' && currentUser.empId !== '3623') return alert('Only Main Admin (3623) can grant admin access!');
    if (accessLevel === 'admin' && secretCode !== 'mudit') return alert('Wrong Secret Code!');
    try {
        const { data: existing, error: selErr } = await sb.from('profiles').select('*').eq('emp_id', empId);
        if (selErr) return alert('DB Error: ' + selErr.message);
        if (existing && existing.length > 0 && existing[0].password_hash) {
            return alert(empId + ' is already registered! Remove and re-add to change role.');
        }
        const pendingList = await loadAppConfigList('pending_registrations');
        const alreadyPending = pendingList.find(p => p.emp_id === empId);
        if (alreadyPending) {
            alreadyPending.access_level = accessLevel;
            await saveAppConfigList('pending_registrations', pendingList);
            alert(accessLevel.charAt(0).toUpperCase() + accessLevel.slice(1) + ' access updated for ' + empId + ' (pending)');
        } else {
            pendingList.push({ emp_id: empId, access_level: accessLevel });
            await saveAppConfigList('pending_registrations', pendingList);
            alert(empId + ' pre-authorized as ' + accessLevel + '. They can now register.');
        }
        document.getElementById('newUserEmpId').value = '';
        loadUserManagementData();
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function deleteOrphanProfile() {
    const empId = document.getElementById('orphanDeleteEmpId')?.value?.trim()?.toUpperCase();
    if (!empId) return alert('Enter Emp ID!');
    if (!confirm('Delete profile for ' + empId + '?')) return;
    try {
        const { error: delErr } = await sb.from('profiles').delete().eq('emp_id', empId);
        if (delErr) return alert('DB Error: ' + delErr.message);
        alert('Profile for ' + empId + ' deleted!');
        document.getElementById('orphanDeleteEmpId').value = '';
        loadUserManagementData();
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function removeUserAccess() {
    const empId = document.getElementById('removeUserEmpId')?.value?.trim()?.toUpperCase();
    const accessLevel = document.getElementById('removeUserAccessLevel')?.value;
    const secretCode = document.getElementById('removeSecretCode')?.value;
    if (!empId) return alert('Enter Emp ID!');
    if (accessLevel === 'admin' && currentUser.empId !== '3623') return alert('Only Main Admin (3623) can remove admin access!');
    if (accessLevel === 'admin' && secretCode !== 'mudit') return alert('Wrong Secret Code!');
    if (empId === '3623') return alert('Cannot remove Main Admin!');
    try {
        const { error: delErr } = await sb.from('profiles').delete().eq('emp_id', empId);
        if (delErr) return alert('DB Error (delete): ' + delErr.message);
        const pendingList = await loadAppConfigList('pending_registrations');
        const idx = pendingList.findIndex(p => p.emp_id === empId);
        if (idx !== -1) {
            pendingList.splice(idx, 1);
            await saveAppConfigList('pending_registrations', pendingList);
        }
        alert('User ' + empId + ' removed!');
        document.getElementById('removeUserEmpId').value = '';
        loadUserManagementData();
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function resetAdminIds() {
    if (!confirm('Reset Admin IDs to only 3623?')) return;
    try {
        const { error } = await sb.from('profiles').update({ access_level: 'crewcontroller' }).eq('access_level', 'admin').neq('emp_id', '3623');
        if (error) return alert('DB Error: ' + error.message);
        const pendingList = await loadAppConfigList('pending_registrations');
        const filtered = pendingList.filter(p => !(p.access_level === 'admin' && p.emp_id !== '3623'));
        await saveAppConfigList('pending_registrations', filtered);
        alert('Admin IDs reset! Only 3623 remains admin.');
        loadUserManagementData();
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function resetCcIds() {
    if (!confirm('Clear all Crew Controller IDs?')) return;
    try {
        const { error } = await sb.from('profiles').update({ access_level: 'user' }).eq('access_level', 'crewcontroller');
        if (error) return alert('DB Error: ' + error.message);
        const pendingList = await loadAppConfigList('pending_registrations');
        const filtered = pendingList.filter(p => p.access_level !== 'crewcontroller');
        await saveAppConfigList('pending_registrations', filtered);
        alert('CC IDs cleared!');
        loadUserManagementData();
    } catch (e) { alert('Error: ' + e.toString()); }
}

// MESSAGE LOG
async function loadMessageLog() {
    try {
        const { data: logs } = await sb.from('message_activity_log').select('*').order('timestamp', { ascending: false });
        const tbody = document.getElementById('messageLogBody');
        if (!tbody) return;
        if (!logs || logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.4);">No message activity logged yet</td></tr>';
            return;
        }
        tbody.innerHTML = '';
        logs.forEach(log => {
            const tr = document.createElement('tr');
            tr.style.background = log.action === 'POSTED' ? 'rgba(34,197,94,0.1)' :
                log.action === 'POPUP' ? 'rgba(168,85,247,0.1)' :
                log.action === 'CLEARED' ? 'rgba(239,68,68,0.1)' : '';
            tr.innerHTML = '<td>' + (log.timestamp || '') + '</td>' +
                '<td style="color:var(--cyan);font-weight:600;">' + (log.emp_id || '') + '</td>' +
                '<td>' + (log.emp_name || '') + '</td>' +
                '<td><span style="padding:2px 6px;border-radius:4px;font-size:9px;background:' +
                (log.action === 'POSTED' ? 'var(--green)' : log.action === 'POPUP' ? 'var(--purple)' : 'var(--red)') +
                ';color:#000;">' + log.action + '</span></td>' +
                '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (log.message || '-') + '</td>';
            tbody.appendChild(tr);
        });
    } catch (e) {}
}

async function clearMessageLog() {
    if (!confirm('Clear Message Activity Log? This cannot be undone!')) return;
    if (!currentUser || currentUser.empId !== '3623') return alert('Only Main Admin (3623) can clear log!');
    try {
        await sb.from('message_activity_log').delete().neq('id', 0);
        alert('Message log cleared!');
        loadMessageLog();
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function clearFormActivityLog() {
    if (!confirm('Clear Form Activity Log? This cannot be undone!')) return;
    if (!currentUser || currentUser.empId !== '3623') return alert('Only Main Admin (3623) can clear log!');
    try {
        await sb.from('form_activity_log').delete().neq('id', 0);
        alert('Form activity log cleared!');
    } catch (e) { alert('Error: ' + e.toString()); }
}

// ENHANCED TETRA KEY REPORT WITH RAKE RELIEVER ANALYSIS
let currentTetraData = null;

async function generateTetraReport() {
    const dayType = document.getElementById('tetraDayType')?.value || 'Weekday';
    const stationFilter = document.getElementById('tetraStation')?.value || 'ALL';
    const direction = document.getElementById('tetraDirection')?.value || 'ALL';
    try {
        const { data, error } = await sb.from('trip_data').select('*').eq('day_type', dayType).order('id', { ascending: true });
        if (error || !data || data.length === 0) { alert('No data found for ' + dayType); return; }

        const rakeTrips = {};
        for (let i = 0; i < data.length; i++) {
            const rake = (data[i]["Rake Num"] || '').toString().trim();
            if (!rake) continue;
            if (!rakeTrips[rake]) rakeTrips[rake] = [];
            rakeTrips[rake].push({
                duty: data[i]["Duty No"],
                depTime: data[i]["Start Time"],
                arrTime: data[i]["End Time"],
                depLoc: (data[i]["Start Stn"] || '').toString().trim().toUpperCase(),
                arrLoc: (data[i]["End Stn"] || '').toString().trim().toUpperCase()
            });
        }

        const tetraData = [];
        const rakeList = [];
        const seenDuties = {};
        const added = {};

        for (const rake in rakeTrips) {
            let trips = rakeTrips[rake];
            trips.sort((a, b) => timeToMins(a.depTime) - timeToMins(b.depTime));

            // Deduplicate identical trips
            const deduped = [];
            const seen = {};
            for (const t of trips) {
                const key = t.depTime + '|' + t.arrTime + '|' + t.depLoc + '|' + t.arrLoc;
                if (!seen[key]) { seen[key] = true; deduped.push(t); }
            }
            trips = deduped;

            if (trips.length === 0) continue;
            rakeList.push(rake);

            // Boarding on first trip
            if (!mathTolerant(timeToMins(trips[0].depTime), timeToMins(trips[0].arrTime))) {
                const uniq = rake + '|' + trips[0].depTime + '|BOARDING';
                if (!added[uniq]) {
                    added[uniq] = true;
                    if (!seenDuties[trips[0].duty]) seenDuties[trips[0].duty] = true;
                    tetraData.push({
                        rakeId: rake, duty: trips[0].duty,
                        boardStn: trips[0].depLoc, boardTime: trips[0].depTime,
                        alightStn: trips[0].arrLoc, alightTime: trips[0].arrTime,
                        station: trips[0].depLoc, action: 'BOARDING'
                    });
                }
            }

            // Gap analysis between consecutive trips (rake reliever)
            for (let j = 0; j < trips.length - 1; j++) {
                const currentEnd = timeToMins(trips[j].arrTime);
                const nextStart = timeToMins(trips[j + 1].depTime);
                const sameDuty = trips[j].duty === trips[j + 1].duty;
                const mkprException = (trips[j].arrLoc === 'MKPR' && trips[j + 1].depLoc === 'MKPR' && sameDuty);

                if (!mathTolerant(currentEnd, nextStart) && !mkprException) {
                    let uniq = rake + '|' + trips[j].arrTime + '|ALIGHTING';
                    if (!added[uniq]) {
                        added[uniq] = true;
                        if (!seenDuties[trips[j].duty]) seenDuties[trips[j].duty] = true;
                        tetraData.push({
                            rakeId: rake, duty: trips[j].duty,
                            boardStn: trips[j].depLoc, boardTime: trips[j].depTime,
                            alightStn: trips[j].arrLoc, alightTime: trips[j].arrTime,
                            station: trips[j].arrLoc, action: 'ALIGHTING'
                        });
                    }
                    uniq = rake + '|' + trips[j + 1].depTime + '|BOARDING';
                    if (!added[uniq]) {
                        added[uniq] = true;
                        if (!seenDuties[trips[j + 1].duty]) seenDuties[trips[j + 1].duty] = true;
                        tetraData.push({
                            rakeId: rake, duty: trips[j + 1].duty,
                            boardStn: trips[j + 1].depLoc, boardTime: trips[j + 1].depTime,
                            alightStn: trips[j + 1].arrLoc, alightTime: trips[j + 1].arrTime,
                            station: trips[j + 1].depLoc, action: 'BOARDING'
                        });
                    }
                }
            }

            // Alighting on last trip
            const last = trips[trips.length - 1];
            if (!mathTolerant(timeToMins(last.depTime), timeToMins(last.arrTime))) {
                const uniq = rake + '|' + last.arrTime + '|ALIGHTING';
                if (!added[uniq]) {
                    added[uniq] = true;
                    if (!seenDuties[last.duty]) seenDuties[last.duty] = true;
                    tetraData.push({
                        rakeId: rake, duty: last.duty,
                        boardStn: last.depLoc, boardTime: last.depTime,
                        alightStn: last.arrLoc, alightTime: last.arrTime,
                        station: last.arrLoc, action: 'ALIGHTING'
                    });
                }
            }
        }

        // Sort by time, then rake
        tetraData.sort((a, b) => {
            const tA = timeToMins(a.action === 'BOARDING' ? a.boardTime : a.alightTime);
            const tB = timeToMins(b.action === 'BOARDING' ? b.boardTime : b.alightTime);
            if (tA !== tB) return tA - tB;
            return a.rakeId.localeCompare(b.rakeId);
        });

        let filtered = tetraData;
        if (stationFilter === 'KKDA+PBGW') {
            filtered = tetraData.filter(d => d.station.indexOf('KKDA') !== -1 || d.station.indexOf('PBGW') !== -1);
        } else if (stationFilter !== 'ALL') {
            filtered = tetraData.filter(d => d.station.indexOf(stationFilter) !== -1);
        }
        if (direction !== 'ALL') {
            filtered = filtered.filter(d => d.action === direction);
        }

        const incomingCount = filtered.filter(d => d.action === 'ALIGHTING').length;
        const outgoingCount = filtered.filter(d => d.action === 'BOARDING').length;
        currentTetraData = {
            tetraData: filtered,
            tetraCount: filtered.length,
            rakeCount: rakeList.length,
            dutyCount: Object.keys(seenDuties).length
        };

        document.getElementById('tetraCount').textContent = filtered.length;
        document.getElementById('tetraIncoming').textContent = incomingCount;
        document.getElementById('tetraOutgoing').textContent = outgoingCount;
        document.getElementById('tetraRakeCount').textContent = rakeList.length;
        document.getElementById('tetraWrapper').style.display = 'block';

        let tableHtml = '';
        filtered.forEach(d => {
            const actionText = d.action === 'BOARDING' ? 'Outgoing' : 'Incoming';
            const stnLabel = d.action === 'BOARDING' ? d.boardStn : d.alightStn;
            const showBoardStn = d.action === 'BOARDING' ? d.boardStn : '-';
            const showBoardTime = d.action === 'BOARDING' ? d.boardTime : '-';
            const showAlightStn = d.action === 'ALIGHTING' ? d.alightStn : '-';
            const showAlightTime = d.action === 'ALIGHTING' ? d.alightTime : '-';
            tableHtml += '<tr style="background:rgba(239,68,68,0.15);">' +
                '<td style="color:var(--red);font-weight:700;">' + d.rakeId + '</td>' +
                '<td style="color:var(--cyan);font-weight:700;">' + d.duty + '</td>' +
                '<td>' + showBoardStn + '</td>' +
                '<td><span class="time-display">' + showBoardTime + '</span></td>' +
                '<td>' + showAlightStn + '</td>' +
                '<td><span class="time-display">' + showAlightTime + '</span></td>' +
                '<td style="color:var(--orange);font-weight:700;">' + stnLabel + '</td>' +
                '<td><span style="background:var(--purple);color:#fff;padding:4px 10px;border-radius:6px;font-weight:bold;">' + actionText + '</span></td>' +
            '</tr>';
        });
        document.getElementById('tetraKeyOutput').innerHTML = tableHtml
            ? '<div class="table-wrap"><table class="data-table"><tr><th>Rake</th><th>Duty</th><th>Board</th><th>Board Time</th><th>Alight</th><th>Alight Time</th><th>Station</th><th>Direction</th></tr>' + tableHtml + '</table></div>'
            : '<p style="color:rgba(255,255,255,0.4);text-align:center;">No tetra key data found for selected filters.</p>';
    } catch (e) { alert('Error: ' + e.toString()); }
}

function downloadTetraExcel() {
    if (!currentTetraData || !currentTetraData.tetraData) return alert('Generate Tetra Key Report first!');
    const dayType = document.getElementById('tetraDayType')?.value || 'Weekday';
    const station = document.getElementById('tetraStation')?.value || 'ALL';
    const direction = document.getElementById('tetraDirection')?.value || 'ALL';
    const wsData = [
        ['Tetra Key Report - ' + dayType],
        ['Station Filter: ' + station],
        ['Direction Filter: ' + (direction === 'ALL' ? 'All' : direction === 'BOARDING' ? 'Boarding (Outgoing)' : 'Deboarding (Incoming)')],
        ['Generated: ' + new Date().toLocaleString()],
        [],
        ['Rake ID', 'Duty Number', 'Boarding Station', 'Boarding Time', 'Alighting Station', 'Alighting Time', 'Station', 'Direction']
    ];
    currentTetraData.tetraData.forEach(d => {
        const action = d.action === 'BOARDING' ? 'Outgoing' : 'Incoming';
        const stationText = d.action === 'BOARDING' ? d.boardStn : d.alightStn;
        wsData.push([d.rakeId, d.duty, d.boardStn, d.boardTime, d.alightStn, d.alightTime, stationText, action]);
    });
    wsData.push([]);
    wsData.push(['Summary']);
    wsData.push(['Total Keys:', currentTetraData.tetraData.length]);
    wsData.push(['Incoming (Deboarding) ↓:', currentTetraData.tetraData.filter(d => d.action === 'ALIGHTING').length]);
    wsData.push(['Outgoing (Boarding) ↑:', currentTetraData.tetraData.filter(d => d.action === 'BOARDING').length]);
    wsData.push(['Total Rakes Involved:', currentTetraData.rakeCount]);
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tetra Key Report');
    XLSX.writeFile(wb, dayType + '_Tetra_Key_Report.xlsx');
}

// ENHANCED GRAPH
let currentChartData = null;

async function generateGraph() {
    const dayType = document.getElementById('graphDay').value;
    const series = Array.from(document.querySelectorAll('input[name="series"]:checked')).map(cb => cb.value);
    const customDuties = getCustomDuties('customDutiesGraph');
    if (series.length === 0 && customDuties.length === 0) return alert('Select series or enter duty numbers!');
    const result = await getGraphData(dayType, series, customDuties);
    if (result.error) { alert(result.error); return; }
    currentChartData = result;
    document.getElementById('graphWrapper').style.display = 'block';
    const seriesStr = series.length > 0 ? 'Series: ' + series.join(', ') : '';
    const customStr = customDuties.length > 0 ? 'Custom: ' + customDuties.join(', ') : '';
    document.getElementById('chartTitle').textContent = dayType + ' - ' + (seriesStr + (customStr ? (seriesStr ? ' | ' : '') + customStr : ''));
    document.getElementById('avgDisplay').textContent = 'AVG: ' + result.avgTime;
    const chartWidth = Math.max(1200, result.details.length * 80 + 100);
    document.getElementById('chartInner').style.width = chartWidth + 'px';
    const getBarColor = (d) => {
        const on = parseInt((d.signOnTime || '').split(':')[0]);
        const off = parseInt((d.signOffTime || '').split(':')[0]);
        if (on < 7 && off >= 22) return '#ef4444';
        if (on < 7) return '#ff9500';
        if (off >= 22) return '#a855f7';
        return '#00d4ff';
    };
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: result.details.map(d => d.duty),
            datasets: [{
                data: result.details.map(d => d.running),
                backgroundColor: result.details.map(d => getBarColor(d)),
                borderColor: result.details.map(d => getBarColor(d)),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            barPercentage: 0.7,
            categoryPercentage: 0.8,
            scales: {
                y: {
                    beginAtZero: true,
                    max: Math.max(...result.details.map(d => d.running)) * 1.25,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#fff', callback: v => formatTime(v), font: { size: 12, weight: 'bold' } },
                    title: { display: true, text: 'Running Hours', color: 'rgba(255,255,255,0.7)', font: { size: 14, weight: 'bold' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#fff', font: { weight: 'bold', size: 12 } }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(20,20,40,0.98)',
                    borderColor: '#00d4ff',
                    borderWidth: 2,
                    titleColor: '#00d4ff',
                    bodyColor: '#fff',
                    titleFont: { weight: 'bold', size: 14 },
                    bodyFont: { size: 13 },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function(context) { return 'Duty: ' + context[0].label; },
                        label: function(context) {
                            const idx = context.dataIndex;
                            const d = result.details[idx];
                            return [ 'Driving Hrs: ' + d.runningStr, 'Sign On: ' + d.signOnTime + ' @ ' + d.signOnLoc, 'Sign Off: ' + d.signOffTime + ' @ ' + d.signOffLoc ];
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'aboveLabels',
            afterDatasetsDraw: function(chart) {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach(function(bar, index) {
                    const d = result.details[index];
                    const barHeight = bar.height;
                    const barX = bar.x;
                    const barY = bar.y;
                    ctx.save();
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = 'rgba(0,0,0,0.9)';
                    ctx.shadowBlur = 5;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(d.runningStr, barX, barY - barHeight - 10);
                    ctx.restore();
                });
            }
        }]
    });
}

function downloadChartPDF() {
    if (!currentChartData) return alert('Generate Chart first!');
    const title = document.getElementById('chartTitle').innerText;
    const avgText = document.getElementById('avgDisplay').innerText;
    const data = currentChartData.details;
    const chartWidth = Math.max(2000, data.length * 90 + 200);
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'background:#1a1a2e;padding:40px;width:' + chartWidth + 'px;min-height:850px;display:flex;flex-direction:column;align-items:center;position:fixed;left:-9999px;top:0;z-index:-1;';
    wrapper.innerHTML = `
        <div style="width:100%;text-align:center;margin-bottom:20px;">
            <h2 style="color:#00d4ff;font-family:Arial,sans-serif;margin:0;font-size:28px;font-weight:bold;">${title}</h2>
        </div>
        <div style="width:100%;text-align:center;margin-bottom:25px;display:flex;justify-content:center;gap:40px;">
            <span style="color:#22c55e;font-family:Arial;font-size:16px;font-weight:bold;">${avgText}</span>
            <span style="color:#fff;font-family:Arial;font-size:16px;">Total Duties: <b style="color:#00d4ff;">${data.length}</b></span>
        </div>
        <div style="width:100%;height:600px;background:rgba(0,0,0,0.3);border-radius:15px;padding:25px;border:1px solid rgba(0,212,255,0.3);">
            <canvas id="pdfChartCanvas"></canvas>
        </div>
        <div style="width:100%;display:flex;justify-content:space-between;margin-top:20px;">
            <div style="color:rgba(255,255,255,0.5);font-size:12px;font-family:Arial;">
                DMRC Line 7 • KKDA & PBGW Crew Control • Generated: ${new Date().toLocaleDateString()}
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);
    setTimeout(() => {
        const getBarColor = (d) => {
            const on = parseInt((d.signOnTime || '').split(':')[0]);
            const off = parseInt((d.signOffTime || '').split(':')[0]);
            if (on < 7 && off >= 22) return '#ef4444';
            if (on < 7) return '#ff9500';
            if (off >= 22) return '#a855f7';
            return '#00d4ff';
        };
        const pdfCtx = document.getElementById('pdfChartCanvas').getContext('2d');
        new Chart(pdfCtx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.duty),
                datasets: [{ data: data.map(d => d.running), backgroundColor: data.map(d => getBarColor(d)), borderColor: data.map(d => getBarColor(d)), borderWidth: 2, borderRadius: 8 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, barPercentage: 0.7, categoryPercentage: 0.8,
            scales: {
                y: { beginAtZero: true, max: Math.max(...data.map(d => d.running)) * 1.25, grid: { color: 'rgba(255,255,255,0.12)' }, ticks: { color: '#fff', font: { size: 13, weight: 'bold' }, callback: v => formatTime(v) }, title: { display: true, text: 'Running Hours', color: 'rgba(255,255,255,0.8)', font: { size: 15, weight: 'bold' } } },
                x: { grid: { display: false }, ticks: { color: '#fff', font: { size: 13, weight: 'bold' } } }
            },
            plugins: { legend: { display: false } }
        }
    });
    setTimeout(() => {
            html2canvas(wrapper, { scale: 1.5, backgroundColor: '#1a1a2e', useCORS: true, logging: false, width: chartWidth, height: 900 }).then(canvasImg => {
                document.body.removeChild(wrapper);
                const imgData = canvasImg.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = title.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
                link.href = imgData;
                link.click();
            }).catch(err => { document.body.removeChild(wrapper); alert('Error generating PNG: ' + err); });
        }, 500);
    }, 100);
}

function downloadChartExcel() {
    if (!currentChartData) return alert('Generate Chart first!');
    const title = document.getElementById('chartTitle').innerText;
    const data = currentChartData.details;
    const wsData = [['Duty', 'Running Time', 'Sign On Loc', 'Sign On Time', 'Sign Off Loc', 'Sign Off Time']];
    data.forEach(d => { wsData.push([d.duty, d.runningStr, d.signOnLoc, d.signOnTime, d.signOffLoc, d.signOffTime]); });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Chart Data');
    XLSX.writeFile(wb, 'chart_data.xlsx');
}

// KM EXCEL
async function downloadKmExcel() {
    const dayType = document.getElementById('kmDay')?.value || 'Weekday';
    const series = Array.from(document.querySelectorAll('input[name="kmSeries"]:checked')).map(cb => cb.value);
    const customDuties = getCustomDuties('customDutiesKm');
    if (series.length === 0 && customDuties.length === 0) return alert('Select series or enter duty numbers!');
    try {
        const { data, error } = await sb.from('trip_data').select('*').eq('day_type', dayType).order('id', { ascending: true });
        if (error || !data || data.length === 0) { alert('No data found for ' + dayType); return; }

        const dutyTotals = {};
        for (let i = 0; i < data.length; i++) {
            const d = (data[i]["Duty No"] || '').toString().trim();
            if (!d) continue;
            const isSeriesMatched = series.some(s => {
                if (s === '11-20') { const num = parseInt(d); return num >= 11 && num <= 20; }
                const num = parseInt(s);
                if (num >= 10) return d === s || d.startsWith(s + '-') || d.startsWith(s + '0');
                return d.startsWith(s);
            });
            const isCustom = customDuties.length > 0 && customDuties.indexOf(d) !== -1;
            if (!isSeriesMatched && !isCustom) continue;
            if (!dutyTotals[d]) dutyTotals[d] = { km: 0, signOn: '', signOnLoc: '', signOff: '', signOffLoc: '' };
            const r = data[i];
            if (r["Rake Num"] && r["Rake Num"].toString().trim() !== '') {
                const from = (r["Start Stn"] || '').toString().trim().toUpperCase();
                const to = (r["End Stn"] || '').toString().trim().toUpperCase();
                dutyTotals[d].km += kmData[from + '|' + to] || 0;
            }
            if (r["Sign On Time"] && (!dutyTotals[d].signOn || r["Sign On Time"] < dutyTotals[d].signOn)) {
                dutyTotals[d].signOn = r["Sign On Time"];
                dutyTotals[d].signOnLoc = r["Sign On Loc"] || '';
            }
            if (r["Sign Off Time"] && (!dutyTotals[d].signOff || r["Sign Off Time"] > dutyTotals[d].signOff)) {
                dutyTotals[d].signOff = r["Sign Off Time"];
                dutyTotals[d].signOffLoc = r["Sign Off Loc"] || '';
            }
        }

        const dutyList = Object.keys(dutyTotals).sort();
        if (dutyList.length === 0) { alert('No duties found for the selected criteria!'); return; }
        let totalKm = 0;
        const wsData = [['Duty', 'Sign On', 'Sign On Loc', 'Sign Off', 'Sign Off Loc', 'KM']];
        dutyList.forEach(d => {
            totalKm += dutyTotals[d].km;
            wsData.push([d, dutyTotals[d].signOn, dutyTotals[d].signOnLoc, dutyTotals[d].signOff, dutyTotals[d].signOffLoc, dutyTotals[d].km.toFixed(2)]);
        });
        wsData.push([]);
        wsData.push(['Total Duties:', dutyList.length]);
        wsData.push(['Total KM:', totalKm.toFixed(2)]);
        wsData.push(['Average KM:', (totalKm / dutyList.length).toFixed(2)]);
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'KM Analysis');
        XLSX.writeFile(wb, dayType + '_KM_Analysis.xlsx');
    } catch (e) { alert('Error: ' + e.toString()); }
}

// INIT
window.addEventListener('DOMContentLoaded', async () => {
    checkExistingSession();
    await loadKmData();
    updateDateTime();
    await loadPopupMessage();
    if (!currentUser) await loadUserMessages();
    const page = document.querySelector('.page.active');
    if (page && page.id) trackVisit(page.id, 'pageview');
});

function trackVisit(page, type) {
    logVisit(page, type, currentUser ? currentUser.empId : null);
}

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
            const d = (data[i]["Duty No"] || '').toString().trim();
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
                const timeStr = (data[i]["Driving Hrs"] || '').toString().trim();
                if (timeStr === '' || timeStr.indexOf(':') === -1) continue;
                const p = timeStr.split(':');
                const mins = (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0);
                seenDuties[d] = true;
                chartData.push({ 
                    duty: d, 
                    running: mins / 60, 
                    runningStr: timeStr, 
                    dutyStr: (data[i]["Duty Hrs"] || '').toString(), 
                    signOnLoc: (data[i]["Sign On Loc"] || '').toString(), 
                    signOnTime: (data[i]["Sign On Time"] || '').toString(), 
                    signOffLoc: (data[i]["Sign Off Loc"] || '').toString(), 
                    signOffTime: (data[i]["Sign Off Time"] || '').toString() 
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

function clearSession() {
    currentUser = null;
    sessionStorage.removeItem('dmrcUser');
    document.getElementById('loggedInUserHeader').classList.remove('show');
    const loginBtn = document.getElementById('minimalLoginText');
    if (loginBtn) loginBtn.textContent = '👤 LOGIN';
    // Hide admin-only elements on logout
    document.querySelectorAll('.admin-only-upload-row, .admin-only-day').forEach(el => el.style.display = 'none');
}

function handleLogout() {
    clearSession();
    showPage('pageHome');
}

async function downloadVisitorLog() {
    try {
        const { data, error } = await sb.from('visitor_logs').select('*').order('timestamp', { ascending: false });
        if (error || !data || data.length === 0) { alert('No visitor data to export'); return; }
        const wsData = [['VISITOR LOG REPORT'], ['Generated: ' + new Date().toLocaleString()], []];
        wsData.push(['Date/Time', 'Page', 'Type', 'Emp ID', 'User Agent']);
        data.forEach(v => {
            wsData.push([v.timestamp || '', v.page || '', v.type || '', v.emp_id || 'Organic', v.user_agent || '']);
        });
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Visitor Log');
        XLSX.writeFile(wb, 'VisitorLog_' + new Date().toISOString().slice(0, 10) + '.xlsx');
    } catch (e) { alert('Error: ' + e.toString()); }
}

async function clearVisitorLog() {
    if (!confirm('Clear all visitor logs?')) return;
    try { await sb.from('visitor_logs').delete().neq('id', 0); alert('Visitor log cleared!'); loadVisitorStats(); } catch (e) { alert('Error: ' + e.toString()); }
}

async function generateKmReport() {
    const dayType = document.getElementById('kmDay')?.value || 'Weekday';
    const series = Array.from(document.querySelectorAll('input[name="kmSeries"]:checked')).map(cb => cb.value);
    const customDuties = getCustomDuties('customDutiesKm');
    if (series.length === 0 && customDuties.length === 0) return alert('Select series or enter duty numbers!');
    try {
        const { data, error } = await sb.from('trip_data').select('*').eq('day_type', dayType).order('id', { ascending: true });
        if (error || !data || data.length === 0) { alert('No data found for ' + dayType); return; }

        const dutyTotals = {};
        for (let i = 0; i < data.length; i++) {
            const d = (data[i]["Duty No"] || '').toString().trim();
            if (!d) continue;
            const isSeriesMatched = series.some(s => {
                if (s === '11-20') {
                    const num = parseInt(d);
                    return num >= 11 && num <= 20;
                }
                const num = parseInt(s);
                if (num >= 10) return d === s || d.startsWith(s + '-') || d.startsWith(s + '0');
                return d.startsWith(s);
            });
            const isCustom = customDuties.length > 0 && customDuties.indexOf(d) !== -1;
            if (!isSeriesMatched && !isCustom) continue;
            if (!dutyTotals[d]) dutyTotals[d] = { km: 0, signOn: '', signOnLoc: '', signOff: '', signOffLoc: '' };
            const r = data[i];
            if (r["Rake Num"] && r["Rake Num"].toString().trim() !== '') {
                const from = (r["Start Stn"] || '').toString().trim().toUpperCase();
                const to = (r["End Stn"] || '').toString().trim().toUpperCase();
                dutyTotals[d].km += kmData[from + '|' + to] || 0;
            }
            if (r["Sign On Time"] && (!dutyTotals[d].signOn || r["Sign On Time"] < dutyTotals[d].signOn)) {
                dutyTotals[d].signOn = r["Sign On Time"];
                dutyTotals[d].signOnLoc = r["Sign On Loc"] || '';
            }
            if (r["Sign Off Time"] && (!dutyTotals[d].signOff || r["Sign Off Time"] > dutyTotals[d].signOff)) {
                dutyTotals[d].signOff = r["Sign Off Time"];
                dutyTotals[d].signOffLoc = r["Sign Off Loc"] || '';
            }
        }

        const dutyList = Object.keys(dutyTotals);
        if (dutyList.length === 0) { alert('No duties found for the selected criteria!'); return; }
        let totalKm = 0;
        const tripRows = [];
        dutyList.sort((a, b) => dutyTotals[b].km - dutyTotals[a].km).forEach(d => {
            totalKm += dutyTotals[d].km;
            tripRows.push({ duty: d, ...dutyTotals[d] });
        });
        const avgKm = totalKm / tripRows.length;
        document.getElementById('kmDutyCount').textContent = tripRows.length;
        document.getElementById('kmTotal').textContent = totalKm.toFixed(2) + ' km';
        document.getElementById('kmAvg').textContent = avgKm.toFixed(2) + ' km';
        document.getElementById('kmWrapper').style.display = 'block';

        const tbody = document.getElementById('kmTable');
        tbody.innerHTML = '';
        tripRows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td style="color:var(--cyan);font-weight:600;">' + r.duty + '</td>' +
                '<td><span class="time-display">' + r.signOn + '</span></td>' +
                '<td>' + r.signOnLoc + '</td>' +
                '<td><span class="time-display">' + r.signOff + '</span></td>' +
                '<td>' + r.signOffLoc + '</td>' +
                '<td><span class="km-tag">' + r.km.toFixed(2) + ' km</span></td>';
            tbody.appendChild(tr);
        });
    } catch (e) { alert('Error: ' + e.toString()); }
}

// MISSING KM AUDIT
async function findMissingKm() {
    try {
        const types = ['Weekday', 'Saturday', 'Sunday', 'Special'];
        const missing = {};
        let totalTrips = 0;
        const allAffectedDuties = new Set();

        for (const type of types) {
            const { data } = await sb.from('trip_data').select('*').eq('day_type', type);
            if (!data) continue;
            for (const r of data) {
                const rake = (r["Rake Num"] || '').toString().trim();
                if (!rake) continue;
                const from = (r["Start Stn"] || '').toString().trim().toUpperCase();
                const to = (r["End Stn"] || '').toString().trim().toUpperCase();
                const key = from + '|' + to;
                const km = kmData[key];
                if (!km || km === 0) {
                    const route = from + ' → ' + to;
                    if (!missing[route]) missing[route] = { count: 0, duties: new Set(), types: new Set() };
                    missing[route].count++;
                    missing[route].duties.add(r["Duty No"]);
                    missing[route].types.add(type);
                    totalTrips++;
                    allAffectedDuties.add(r["Duty No"]);
                }
            }
        }

        document.getElementById('missingKmWrapper').style.display = 'block';
        document.getElementById('missingRouteCount').textContent = Object.keys(missing).length;
        document.getElementById('missingTripCount').textContent = totalTrips;
        document.getElementById('missingDutyCount').textContent = allAffectedDuties.size;

        const tbody = document.getElementById('missingKmBody');
        tbody.innerHTML = '';
        if (Object.keys(missing).length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--green);padding:20px;">✅ All routes have KM data assigned!</td></tr>';
            return;
        }

        const sorted = Object.entries(missing).sort((a, b) => b[1].count - a[1].count);
        for (const [route, info] of sorted) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td style="color:var(--red);font-weight:700;">' + route + '</td>' +
                '<td style="color:var(--orange);font-weight:700;">' + info.count + '</td>' +
                '<td style="color:var(--cyan);">' + [...info.duties].sort((a,b)=>a-b).join(', ') + '</td>' +
                '<td>' + [...info.types].join(', ') + '</td>';
            tbody.appendChild(tr);
        }
    } catch (e) { alert('Error: ' + e.toString()); }
}

// Initialize series grids
function initSeriesGrid() {
    const series = ['1','2','3','4','5','6','7','8','9','10','11-20'];
    const labels = ['100s','200s','300s','400s','500s','600s','700s','800s','900s','10s','11-20'];
    const grid = document.getElementById('seriesGrid');
    if (grid) {
        grid.innerHTML = series.map((s, i) => '<label><input type="checkbox" name="series" value="' + s + '"> ' + labels[i] + '</label>').join('');
    }
    const kmGrid = document.getElementById('kmSeriesGrid');
    if (kmGrid) {
        kmGrid.innerHTML = series.map((s, i) => '<label><input type="checkbox" name="kmSeries" value="' + s + '"> ' + labels[i] + '</label>').join('');
    }
}

function toggleLoginModal() {
    const m = document.getElementById('loginModal');
    if (m.style.display === 'flex') {
        m.style.display = 'none';
    } else {
        m.style.display = 'flex';
        document.getElementById('loginEmpId').value = '';
        document.getElementById('loginPassword').value = '';
        const err = document.getElementById('loginError');
        if (err) err.style.display = 'none';
        setTimeout(() => document.getElementById('loginEmpId').focus(), 100);
    }
}

async function handleLogin() {
    const eid = document.getElementById('loginEmpId').value.trim().toUpperCase();
    const pwd = document.getElementById('loginPassword').value;
    const err = document.getElementById('loginError');
    const hash = hashPassword(pwd);
    try {
        const { data, error } = await sb.from('profiles').select('*').eq('emp_id', eid);
        if (error) {
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
        if (userData.password_hash === hash) {
            saveSession({ empId: userData.emp_id, name: userData.full_name, accessLevel: userData.access_level });
            toggleLoginModal();
            showPage('pageAdmin');
            loadAdminData();
        } else {
            err.textContent = 'Invalid credentials!';
            err.style.display = 'block';
        }
    } catch(e) {
        err.textContent = 'Error: ' + e.toString();
        err.style.display = 'block';
    }
}

// === TETRA KEY DASHBOARD ===
let tetraDashboardStation = 'KKDA';
let tetraDashClockInterval = null;
let tetraDashHighlightInterval = null;
let tetraDashAutoInterval = null;
let tetraDashData = { incoming: [], outgoing: [] };

function getCurrentDayType() {
    const d = new Date();
    const day = d.getDay();
    if (day === 0) return 'Sunday';
    if (day === 6) return 'Saturday';
    return 'Weekday';
}

function showTetraDashboard() {
    showPage('pageTetraDashboard');
    const daySelect = document.getElementById('tetraDashDay');
    if (daySelect) daySelect.value = getCurrentDayType();
    document.getElementById('tetraStationKKDA').className = 'tetra-station-btn active';
    document.getElementById('tetraStationPBGW').className = 'tetra-station-btn';
    tetraDashboardStation = 'KKDA';
    startTetraDashClock();
    generateTetraDashboard();
    // Auto-refresh every 60 seconds
    if (tetraDashAutoInterval) clearInterval(tetraDashAutoInterval);
    tetraDashAutoInterval = setInterval(generateTetraDashboard, 60000);
}

function setTetraStation(station) {
    tetraDashboardStation = station;
    document.getElementById('tetraStationKKDA').className = 'tetra-station-btn' + (station === 'KKDA' ? ' active' : '');
    document.getElementById('tetraStationPBGW').className = 'tetra-station-btn' + (station === 'PBGW' ? ' active' : '');
    generateTetraDashboard();
}

function startTetraDashClock() {
    if (tetraDashClockInterval) clearInterval(tetraDashClockInterval);
    if (tetraDashHighlightInterval) clearInterval(tetraDashHighlightInterval);
    function updateClock() {
        const now = new Date();
        const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const el = document.getElementById('tetraLiveClock');
        if (el) el.textContent = time;
    }
    updateClock();
    tetraDashClockInterval = setInterval(updateClock, 1000);
    tetraDashHighlightInterval = setInterval(highlightCurrentHour, 60000);
    setTimeout(highlightCurrentHour, 100);
}

async function generateTetraDashboard() {
    const dayType = document.getElementById('tetraDashDay')?.value || getCurrentDayType();
    const station = tetraDashboardStation;
    const refreshedEl = document.getElementById('tetraDashRefreshed');
    if (refreshedEl) refreshedEl.textContent = 'Updated: ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    try {
        const { data } = await sb.from('trip_data').select('*').eq('day_type', dayType);
        if (!data || data.length === 0) {
            document.getElementById('tetraDashHourlyBody').innerHTML = '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No data found for ' + dayType + '</td></tr>';
            document.getElementById('tetraDashAlerts').style.display = 'none';
            document.getElementById('tetraDashUpcomingBadge').style.display = 'none';
            document.getElementById('tetraDashSignOnSection').style.display = 'none';
            document.getElementById('tetraDashSignOffSection').style.display = 'none';
            return;
        }

        // ===== SIGN ON/OFF AT IPE/MKPR =====
        const dutyTrips = {};
        for (let i = 0; i < data.length; i++) {
            const duty = (data[i]["Duty No"] || '').toString().trim();
            if (!duty) continue;
            if (!dutyTrips[duty]) dutyTrips[duty] = [];
            dutyTrips[duty].push({
                depTime: data[i]["Start Time"],
                arrTime: data[i]["End Time"],
                depLoc: (data[i]["Start Stn"] || '').toString().trim().toUpperCase(),
                arrLoc: (data[i]["End Stn"] || '').toString().trim().toUpperCase()
            });
        }
        const signOnStation = station === 'KKDA' ? 'IPE' : 'MKPR';
        const signOffStation = station === 'KKDA' ? 'IPE' : 'MKPR';
        const signOnList = [];
        const signOffList = [];
        for (const duty in dutyTrips) {
            const trips = dutyTrips[duty].sort((a, b) => timeToMins(a.depTime) - timeToMins(b.depTime));
            const first = trips[0];
            const last = trips[trips.length - 1];
            if (first.depLoc === signOnStation) signOnList.push({ duty, time: first.depTime });
            if (last.arrLoc === signOffStation) signOffList.push({ duty, time: last.arrTime });
        }
        signOnList.sort((a, b) => timeToMins(a.time) - timeToMins(b.time));
        signOffList.sort((a, b) => timeToMins(a.time) - timeToMins(b.time));

        // Render sign on
        document.getElementById('tetraDashSignOnTitle').textContent = 'Sign On at ' + signOnStation + ' — ' + signOnList.length + ' duties';
        const signOnBody = document.getElementById('tetraDashSignOnBody');
        signOnBody.innerHTML = signOnList.length > 0
            ? signOnList.map(s => '<tr><td style="color:var(--cyan);font-weight:600;">' + s.duty + '</td><td><span class="time-display">' + s.time + '</span></td></tr>').join('')
            : '<tr><td colspan="2" style="text-align:center;color:rgba(255,255,255,0.3);padding:8px;">No sign on at ' + signOnStation + '</td></tr>';
        document.getElementById('tetraDashSignOnSection').style.display = 'block';

        // Render sign off
        document.getElementById('tetraDashSignOffTitle').textContent = 'Sign Off at ' + signOffStation + ' — ' + signOffList.length + ' duties';
        const signOffBody = document.getElementById('tetraDashSignOffBody');
        signOffBody.innerHTML = signOffList.length > 0
            ? signOffList.map(s => '<tr><td style="color:var(--cyan);font-weight:600;">' + s.duty + '</td><td><span class="time-display">' + s.time + '</span></td></tr>').join('')
            : '<tr><td colspan="2" style="text-align:center;color:rgba(255,255,255,0.3);padding:8px;">No sign off at ' + signOffStation + '</td></tr>';
        document.getElementById('tetraDashSignOffSection').style.display = 'block';

        // ===== TETRA GAP ANALYSIS =====
        const rakeTrips = {};
        for (let i = 0; i < data.length; i++) {
            const rake = (data[i]["Rake Num"] || '').toString().trim();
            if (!rake) continue;
            if (!rakeTrips[rake]) rakeTrips[rake] = [];
            rakeTrips[rake].push({
                duty: data[i]["Duty No"],
                depTime: data[i]["Start Time"],
                arrTime: data[i]["End Time"],
                depLoc: (data[i]["Start Stn"] || '').toString().trim().toUpperCase(),
                arrLoc: (data[i]["End Stn"] || '').toString().trim().toUpperCase()
            });
        }

        const tetraEvents = [];
        const added = {};
        for (const rake in rakeTrips) {
            let trips = rakeTrips[rake];
            trips.sort((a, b) => timeToMins(a.depTime) - timeToMins(b.depTime));
            const deduped = [];
            const seen = {};
            for (const t of trips) {
                const key = t.depTime + '|' + t.arrTime + '|' + t.depLoc + '|' + t.arrLoc;
                if (!seen[key]) { seen[key] = true; deduped.push(t); }
            }
            trips = deduped;
            if (trips.length === 0) continue;

            if (!mathTolerant(timeToMins(trips[0].depTime), timeToMins(trips[0].arrTime))) {
                const uniq = rake + '|' + trips[0].depTime + '|BOARDING';
                if (!added[uniq]) {
                    added[uniq] = true;
                    tetraEvents.push({ rakeId: rake, duty: trips[0].duty, station: trips[0].depLoc, time: trips[0].depTime, from: trips[0].depLoc, to: trips[0].arrLoc, action: 'BOARDING' });
                }
            }
            for (let j = 0; j < trips.length - 1; j++) {
                const currentEnd = timeToMins(trips[j].arrTime);
                const nextStart = timeToMins(trips[j + 1].depTime);
                const sameDuty = trips[j].duty === trips[j + 1].duty;
                const mkprException = (trips[j].arrLoc === 'MKPR' && trips[j + 1].depLoc === 'MKPR' && sameDuty);
                if (!mathTolerant(currentEnd, nextStart) && !mkprException) {
                    let uniq = rake + '|' + trips[j].arrTime + '|ALIGHTING';
                    if (!added[uniq]) {
                        added[uniq] = true;
                        tetraEvents.push({ rakeId: rake, duty: trips[j].duty, station: trips[j].arrLoc, time: trips[j].arrTime, from: trips[j].depLoc, to: trips[j].arrLoc, action: 'ALIGHTING' });
                    }
                    uniq = rake + '|' + trips[j + 1].depTime + '|BOARDING';
                    if (!added[uniq]) {
                        added[uniq] = true;
                        tetraEvents.push({ rakeId: rake, duty: trips[j + 1].duty, station: trips[j + 1].depLoc, time: trips[j + 1].depTime, from: trips[j + 1].depLoc, to: trips[j + 1].arrLoc, action: 'BOARDING' });
                    }
                }
            }
            const last = trips[trips.length - 1];
            if (!mathTolerant(timeToMins(last.depTime), timeToMins(last.arrTime))) {
                const uniq = rake + '|' + last.arrTime + '|ALIGHTING';
                if (!added[uniq]) {
                    added[uniq] = true;
                    tetraEvents.push({ rakeId: rake, duty: last.duty, station: last.arrLoc, time: last.arrTime, from: last.depLoc, to: last.arrLoc, action: 'ALIGHTING' });
                }
            }
        }

        tetraEvents.sort((a, b) => timeToMins(a.time) - timeToMins(b.time));

        // Filter by station
        const filtered = tetraEvents.filter(e => e.station.indexOf(station) !== -1);
        const incoming = filtered.filter(e => e.action === 'ALIGHTING');
        const outgoing = filtered.filter(e => e.action === 'BOARDING');
        tetraDashData = { incoming, outgoing };

        const otherStation = station === 'KKDA' ? 'PBGW' : 'KKDA';
        const otherFiltered = tetraEvents.filter(e => e.station.indexOf(otherStation) !== -1);

        // Hourly counts
        const hourly = {};
        for (let h = 0; h < 24; h++) hourly[h] = { in: 0, out: 0, events: [] };
        filtered.forEach(e => {
            const hour = parseInt(e.time.split(':')[0]);
            if (hourly[hour]) {
                if (e.action === 'ALIGHTING') hourly[hour].in++;
                else hourly[hour].out++;
                hourly[hour].events.push(e);
            }
        });

        const otherHourly = {};
        for (let h = 0; h < 24; h++) otherHourly[h] = { in: 0, out: 0 };
        otherFiltered.forEach(e => {
            const hour = parseInt(e.time.split(':')[0]);
            if (otherHourly[hour]) {
                if (e.action === 'ALIGHTING') otherHourly[hour].in++;
                else otherHourly[hour].out++;
            }
        });

        // Summary cards
        document.getElementById('tetraDashTotal').textContent = filtered.length;
        document.getElementById('tetraDashIncoming').textContent = incoming.length;
        document.getElementById('tetraDashOutgoing').textContent = outgoing.length;
        const netBalance = incoming.length - outgoing.length;
        const netEl = document.getElementById('tetraDashNet');
        netEl.textContent = netBalance >= 0 ? '+' + netBalance : netBalance;
        netEl.style.color = netBalance >= 0 ? 'var(--green)' : 'var(--red)';

        // Running balance across all 24 hours
        let runningBalance = 0;
        const hourlyBalance = {};
        for (let h = 0; h < 24; h++) {
            runningBalance += hourly[h].in - hourly[h].out;
            hourlyBalance[h] = runningBalance;
        }

        // Render hourly table with running balance
        const currentHour = new Date().getHours();
        let hourlyHtml = '';
        let shortageAlerts = [];
        let upcomingReqs = [];

        for (let h = 0; h < 24; h++) {
            const hd = hourly[h];
            if (hd.in === 0 && hd.out === 0) continue;
            const bal = hourlyBalance[h];
            const isCurrent = h === currentHour;
            const isFuture = h > currentHour;
            const isShortage = bal < 0;

            let statusText, statusColor;
            if (bal > 0) {
                statusText = '✅ Surplus +' + bal;
                statusColor = 'var(--green)';
            } else if (bal === 0) {
                statusText = '✅ Balanced';
                statusColor = 'rgba(255,255,255,0.5)';
            } else {
                statusText = isFuture ? '⏳ Need ' + Math.abs(bal) : '⛔ Need ' + Math.abs(bal);
                statusColor = isFuture ? 'var(--orange)' : 'var(--red)';
            }

            // Cross-CC info
            const otherNet = otherHourly[h].in - otherHourly[h].out;
            let crossCcText = '-';
            if (isShortage && otherNet > 0) {
                crossCcText = '📞 ' + otherStation + ' has +' + otherNet;
            } else if (otherNet > 0) {
                crossCcText = otherStation + ' has +' + otherNet;
            }

            // Shortage alerts
            if (isShortage) {
                shortageAlerts.push({ hour: h, need: Math.abs(bal), otherNet: otherNet });
            }

            // Upcoming shortages
            if (isFuture && isShortage) {
                upcomingReqs.push({ hour: h, need: Math.abs(bal) });
            }

            // Row styling
            let rowBg = '';
            if (isCurrent) rowBg = 'background:rgba(239,68,68,0.25);border-left:3px solid var(--red);';
            else if (isFuture && isShortage) rowBg = 'background:rgba(255,160,0,0.1);border-left:3px solid rgba(255,160,0,0.3);';
            else if (isShortage) rowBg = 'background:rgba(239,68,68,0.1);border-left:3px solid rgba(239,68,68,0.3);';
            else if (bal > 0) rowBg = 'background:rgba(34,197,94,0.08);border-left:3px solid rgba(34,197,94,0.3);';

            hourlyHtml += '<tr style="' + rowBg + '">' +
                '<td style="font-weight:700;' + (isCurrent ? 'color:var(--red);' : '') + '">' + (isCurrent ? '▶ ' : '') + ('0' + h).slice(-2) + ':00</td>' +
                '<td style="color:var(--green);font-weight:600;">' + hd.in + '</td>' +
                '<td style="color:var(--orange);font-weight:600;">' + hd.out + '</td>' +
                '<td style="color:' + (bal > 0 ? 'var(--green)' : bal < 0 ? (isFuture ? 'var(--orange)' : 'var(--red)') : 'rgba(255,255,255,0.5)') + ';font-weight:700;">' + (bal > 0 ? '+' : '') + bal + '</td>' +
                '<td style="color:' + statusColor + ';font-weight:600;">' + statusText + '</td>' +
                '<td style="font-size:10px;color:' + (otherNet > 0 ? 'var(--cyan)' : 'rgba(255,255,255,0.4)') + ';">' + crossCcText + '</td>' +
                '</tr>';
        }

        if (!hourlyHtml) {
            hourlyHtml = '<tr><td colspan="6" style="text-align:center;color:rgba(255,255,255,0.4);padding:15px;">No tetra key events at ' + station + '</td></tr>';
        }
        document.getElementById('tetraDashHourlyBody').innerHTML = hourlyHtml;

        // Alert bars (collapsible section)
        const alertSection = document.getElementById('tetraDashAlertSection');
        const alertContainer = document.getElementById('tetraDashAlerts');
        if (shortageAlerts.length > 0) {
            let alertHtml = '';
            shortageAlerts.forEach(a => {
                const isPast = a.hour < currentHour;
                alertHtml += '<div style="background:rgba(239,68,68,0.2);border:2px solid var(--red);border-radius:10px;padding:10px 15px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">' +
                    '<span style="font-size:20px;">' + (isPast ? '⛔' : '⏳') + '</span>' +
                    '<div style="flex:1;"><strong style="color:var(--red);font-size:13px;">Hour ' + ('0' + a.hour).slice(-2) + ':00 ' + (isPast ? 'SHORTAGE' : 'UPCOMING SHORTAGE') + '</strong>' +
                    '<div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:2px;">Running deficit of ' + a.need + ' tetra key(s)' + (isPast ? '' : ' (future)') + '</div></div>';
                if (a.otherNet > 0) {
                    alertHtml += '<div style="background:rgba(0,212,255,0.2);border:1px solid var(--cyan);border-radius:6px;padding:6px 10px;text-align:center;font-size:10px;">' +
                        '<span style="color:var(--cyan);font-weight:700;">📞 ' + otherStation + '</span><br><span style="color:#fff;">+' + a.otherNet + ' spare</span></div>';
                }
                alertHtml += '</div>';
            });
            alertContainer.innerHTML = alertHtml;
            document.getElementById('tetraDashAlertToggleText').textContent = shortageAlerts.length + ' shortage alert(s)';
            alertContainer.style.display = 'block';
            alertSection.style.display = 'block';
        } else {
            alertSection.style.display = 'none';
        }

        // Detail tables
        const inBody = document.getElementById('tetraDashIncomingBody');
        inBody.innerHTML = incoming.length > 0
            ? incoming.map(e => '<tr><td><span class="time-display">' + e.time + '</span></td><td style="color:var(--cyan);font-weight:600;">' + e.rakeId + '</td><td>' + e.duty + '</td><td>' + e.from + '</td><td style="color:var(--orange);">' + e.to + '</td></tr>').join('')
            : '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.4);padding:12px;">No incoming events</td></tr>';

        const outBody = document.getElementById('tetraDashOutgoingBody');
        outBody.innerHTML = outgoing.length > 0
            ? outgoing.map(e => '<tr><td><span class="time-display">' + e.time + '</span></td><td style="color:var(--cyan);font-weight:600;">' + e.rakeId + '</td><td>' + e.duty + '</td><td style="color:var(--orange);">' + e.from + '</td><td>' + e.to + '</td></tr>').join('')
            : '<tr><td colspan="5" style="text-align:center;color:rgba(255,255,255,0.4);padding:12px;">No outgoing events</td></tr>';

        highlightCurrentHour();
    } catch (e) {
        console.error('Tetra Dashboard Error:', e);
        document.getElementById('tetraDashHourlyBody').innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--red);padding:15px;">Error: ' + e.toString() + '</td></tr>';
    }
}

function highlightCurrentHour() {
    const currentHour = new Date().getHours();
    const rows = document.querySelectorAll('#tetraDashHourlyBody tr');
    rows.forEach((row, i) => {
        const hourTd = row.querySelector('td:first-child');
        if (!hourTd) return;
        const hourText = hourTd.textContent.trim();
        const hourMatch = hourText.match(/(\d{2}):00/);
        if (hourMatch) {
            const rowHour = parseInt(hourMatch[1]);
            if (rowHour === currentHour) {
                row.style.background = 'rgba(239,68,68,0.25)';
                row.style.borderLeft = '3px solid var(--red)';
            } else {
                row.style.background = '';
                row.style.borderLeft = '';
            }
        }
    });
}

function toggleTetraAlerts() {
    const container = document.getElementById('tetraDashAlerts');
    const arrow = document.getElementById('tetraDashAlertArrow');
    if (!container || !arrow) return;
    const isVisible = container.style.display !== 'none';
    container.style.display = isVisible ? 'none' : 'block';
    arrow.textContent = isVisible ? '▶' : '▼';
}
function toggleTetraSignOn() {
    const wrap = document.getElementById('tetraDashSignOnBodyWrap');
    const arrow = document.getElementById('tetraDashSignOnArrow');
    if (!wrap || !arrow) return;
    const isVisible = wrap.style.display !== 'none';
    wrap.style.display = isVisible ? 'none' : 'block';
    arrow.textContent = isVisible ? '▶' : '▼';
}
function toggleTetraSignOff() {
    const wrap = document.getElementById('tetraDashSignOffBodyWrap');
    const arrow = document.getElementById('tetraDashSignOffArrow');
    if (!wrap || !arrow) return;
    const isVisible = wrap.style.display !== 'none';
    wrap.style.display = isVisible ? 'none' : 'block';
    arrow.textContent = isVisible ? '▶' : '▼';
}

// === KM ANALYSIS ===
async function showKmAnalysis() {
    showPage('pageKmAnalysis');
    await loadKmData();
    const daySelect = document.getElementById('kmAnalysisDay');
    if (daySelect) {
        daySelect.value = getCurrentDayType();
        if (!daySelect.hasAttribute('data-listener')) {
            daySelect.addEventListener('change', function() { generateKmAnalysis(); });
            daySelect.setAttribute('data-listener', '1');
        }
    }
    await generateKmAnalysis();
}

async function generateKmAnalysis() {
    const dayType = document.getElementById('kmAnalysisDay')?.value || getCurrentDayType();
    document.getElementById('kmAnalysisBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:rgba(255,255,255,0.3);padding:15px;">⏳ Loading ' + dayType + '...</td></tr>';
    document.getElementById('kmAnalysisCount').textContent = dayType + ' — loading...';
    try {
        const { data, error } = await sb.from('trip_data').select('*').eq('day_type', dayType);
        if (error) {
            document.getElementById('kmAnalysisBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);padding:15px;">DB Error: ' + error.message + '</td></tr>';
            document.getElementById('kmAnalysisCount').textContent = dayType + ' — error';
            return;
        }
        if (!data || data.length === 0) {
            document.getElementById('kmAnalysisBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:rgba(255,255,255,0.4);padding:20px;">No data found for ' + dayType + '</td></tr>';
            document.getElementById('kmAnalysisCount').textContent = dayType + ' — 0 trips';
            return;
        }

        // Ensure kmData is loaded
        if (Object.keys(kmData).length === 0) {
            kmData = { ...KM_MAP };
        }

        // Group by duty, sum KM
        const dutyMap = {};
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const duty = (row["Duty No"] || '').toString().trim();
            if (!duty) continue;
            if (!dutyMap[duty]) dutyMap[duty] = { trips: [], totalKm: 0 };
            const from = (row["Start Stn"] || '').toString().trim().toUpperCase();
            const to = (row["End Stn"] || '').toString().trim().toUpperCase();
            const key = from + '|' + to;
            const km = kmData[key] || 0;
            dutyMap[duty].trips.push({ from, to, km, depTime: row["Start Time"], arrTime: row["End Time"], rake: row["Rake Num"] });
            dutyMap[duty].totalKm += km;
        }

        // Sort by total KM descending
        const sorted = Object.keys(dutyMap).sort((a, b) => dutyMap[b].totalKm - dutyMap[a].totalKm);

        document.getElementById('kmAnalysisCount').textContent = dayType + ' — ' + sorted.length + ' duties, ' + data.length + ' trips';

        // Render table with expandable rows
        let html = '';
        sorted.forEach((duty, idx) => {
            const d = dutyMap[duty];
            const rank = idx + 1;
            const tripsCount = d.trips.length;
            // Compute sign on (first trip by depTime) and sign off (last trip by arrTime)
            d.trips.sort((a, b) => timeToMins(a.depTime) - timeToMins(b.depTime));
            const signOn = d.trips[0];
            const signOff = d.trips[d.trips.length - 1];
            const signOnText = signOn.from + ' @ ' + signOn.depTime;
            const signOffText = signOff.to + ' @ ' + signOff.arrTime;
            html += '<tr class="km-row" onclick="toggleKmDetail(\'' + duty + '\')" style="cursor:pointer;">' +
                '<td style="color:rgba(255,255,255,0.4);font-weight:600;">' + rank + '</td>' +
                '<td style="color:var(--cyan);font-weight:700;">' + duty + '</td>' +
                '<td style="font-size:9px;color:var(--orange);">' + signOnText + '</td>' +
                '<td style="font-size:9px;color:var(--orange);">' + signOffText + '</td>' +
                '<td style="color:var(--green);font-weight:700;">' + d.totalKm.toFixed(2) + '</td>' +
                '<td style="color:rgba(255,255,255,0.5);">' + tripsCount + '</td>' +
                '<td style="font-size:8px;color:rgba(255,255,255,0.3);">▼</td>' +
                '</tr>' +
                '<tr id="kmDetail-' + duty + '" class="km-detail-row" style="display:none;">' +
                '<td colspan="7" style="padding:0;background:rgba(0,0,0,0.2);">' +
                '<div class="km-detail-inner"><table class="data-table" style="font-size:9px;margin:0;">' +
                '<tr><th style="padding:4px 8px;">#</th><th style="padding:4px 8px;">Rake</th><th style="padding:4px 8px;">Time</th><th style="padding:4px 8px;">From</th><th style="padding:4px 8px;">To</th><th style="padding:4px 8px;">KM</th></tr>';
            d.trips.forEach((t, ti) => {
                html += '<tr><td style="padding:3px 8px;color:rgba(255,255,255,0.4);">' + (ti + 1) + '</td>' +
                    '<td style="padding:3px 8px;color:var(--cyan);">' + (t.rake || '-') + '</td>' +
                    '<td style="padding:3px 8px;">' + t.depTime + ' → ' + t.arrTime + '</td>' +
                    '<td style="padding:3px 8px;color:var(--orange);">' + t.from + '</td>' +
                    '<td style="padding:3px 8px;">' + t.to + '</td>' +
                    '<td style="padding:3px 8px;color:var(--green);font-weight:600;">' + t.km.toFixed(2) + '</td></tr>';
            });
            html += '</table></div></td></tr>';
        });

        document.getElementById('kmAnalysisBody').innerHTML = html;
    } catch (e) {
        console.error('KM Analysis Error:', e);
        document.getElementById('kmAnalysisBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);padding:15px;">Error: ' + e.toString() + '</td></tr>';
    }
}

function toggleKmDetail(duty) {
    const row = document.getElementById('kmDetail-' + duty);
    if (!row) return;
    const isHidden = row.style.display === 'none';
    row.style.display = isHidden ? 'table-row' : 'none';
}

// === TETRA DASHBOARD EXCEL EXPORT ===
function downloadTetraIncomingExcel() {
    const events = tetraDashData.incoming;
    if (!events || events.length === 0) return alert('No incoming events to export!');
    const dayType = document.getElementById('tetraDashDay')?.value || 'Unknown';
    const station = tetraDashboardStation;
    const wsData = [
        ['Incoming (Alighting) Tetra Key Events'],
        ['Station: ' + station + ' | Day Type: ' + dayType],
        ['Generated: ' + new Date().toLocaleString()],
        [],
        ['Time', 'Rake', 'Duty', 'From', 'To']
    ];
    events.forEach(e => wsData.push([e.time, e.rakeId, e.duty, e.from, e.to]));
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Incoming Tetra');
    XLSX.writeFile(wb, station + '_' + dayType + '_Incoming_Tetra.xlsx');
}

function downloadTetraOutgoingExcel() {
    const events = tetraDashData.outgoing;
    if (!events || events.length === 0) return alert('No outgoing events to export!');
    const dayType = document.getElementById('tetraDashDay')?.value || 'Unknown';
    const station = tetraDashboardStation;
    const wsData = [
        ['Outgoing (Boarding) Tetra Key Events'],
        ['Station: ' + station + ' | Day Type: ' + dayType],
        ['Generated: ' + new Date().toLocaleString()],
        [],
        ['Time', 'Rake', 'Duty', 'From', 'To']
    ];
    events.forEach(e => wsData.push([e.time, e.rakeId, e.duty, e.from, e.to]));
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outgoing Tetra');
    XLSX.writeFile(wb, station + '_' + dayType + '_Outgoing_Tetra.xlsx');
}
