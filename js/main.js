// js/main.js 

// ==========================================
// 1. 교사 설정 및 퀘스트 데이터 (규칙 1, 2, 6, 7)
// ==========================================
const TEACHER_ACCESS = Object.freeze({
    unlockedQuest: 1,        // 규칙 1: 3단원까지는 완료 여부와 무관하게 M1 진입 가능
    lockedQuest: 2,          // 규칙 2, 5: 학생이 미션을 다 깨도 5단원으로는 넘어갈 수 없음 (상한선)
    explicitLocks: []        // 규칙 6: 교사가 강제로 막아둔 특정 미션 ('퀘스트:미션' 형식)
});

// 실제 제작된 콘텐츠 구조 (규칙 7: 미제작 항목 접근 불가 판정을 위해 사용)
const QUESTS = Object.freeze({
    1: { title: '영양소', missions: [{id: 1}, {id: 2}] }, // Quest 1: 2개의 미션 보유
    2: { title: '소화', missions: [{id: 1}, {id: 2}, {id: 3}, {id: 4}] },
    3: { title: '순환', missions: [{id: 1}, {id: 2}, {id: 3}] },
    4: { title: '호흡', missions: [{id: 1}, {id: 2}] },
    5: { title: '배설', missions: [{id: 1}] }, 
    6: { title: '종합', missions: [{id: 1}] }
});

// ==========================================
// 2. 데이터 저장 및 불러오기 (rewards.js 호환)
// ==========================================
function getProgress() {
    const saved = localStorage.getItem('humanbodyProgress');
    let p = saved ? JSON.parse(saved) : {};
    if (!p.completedMissions) p.completedMissions = []; // 예: ["1_1", "1_2", "2_1"]
    if (!p.rewards) p.rewards = [];
    return p;
}

function saveProgress(p) {
    localStorage.setItem('humanbodyProgress', JSON.stringify(p));
}

// 글로벌 API 연결 (rewards.js에서 이 함수들을 사용하게 됨)
window.getProgress = getProgress;
window.saveProgress = saveProgress;

// ==========================================
// 3. 편의용 진행 판정 함수
// ==========================================
function isMissionCompleted(questId, missionId) {
    return getProgress().completedMissions.includes(`${questId}_${missionId}`);
}

function isQuestFullyCompleted(questId) {
    if (!QUESTS[questId] || QUESTS[questId].missions.length === 0) return false;
    const p = getProgress();
    return QUESTS[questId].missions.every(m => p.completedMissions.includes(`${questId}_${m.id}`));
}

// ==========================================
// 4. 핵심 접근 판정 로직 (9가지 규칙 총집합)
// ==========================================
function canAccessMission(questId, missionId) {
    questId = parseInt(questId);
    missionId = parseInt(missionId);

    // 규칙 7: 실제 콘텐츠가 없는 미제작 항목인가?
    if (!QUESTS[questId]) return { access: false, reason: 'not_created' };
    const missionExists = QUESTS[questId].missions.some(m => m.id === missionId);
    if (!missionExists) return { access: false, reason: 'not_created' };

    // 규칙 6: 교사가 명시적으로 잠근 항목인가?
    if (TEACHER_ACCESS.explicitLocks.includes(`${questId}:${missionId}`)) {
        return { access: false, reason: 'explicit_lock' };
    }

    // 규칙 2: 교사가 정한 퀘스트 상한선을 넘었는가?
    if (questId > TEACHER_ACCESS.lockedQuest) {
        return { access: false, reason: 'teacher_locked_quest' };
    }

    // 규칙 3: 학생이 이미 직접 완료한 미션인가? (언제든 복습 가능)
    if (isMissionCompleted(questId, missionId)) {
        return { access: true, reason: 'completed' };
    }

    // 규칙 1: 퀘스트를 깨지 않았어도, 교사가 개방한 퀘스트의 1번 미션인가?
    if (questId <= TEACHER_ACCESS.unlockedQuest && missionId === 1) {
        return { access: true, reason: 'teacher_unlocked' };
    }

    // 1단원 1번 미션은 항상 기본적으로 접근 가능 (규칙 9 초기화 상태)
    if (questId === 1 && missionId === 1) {
        return { access: true, reason: 'first_mission' };
    }

    // 규칙 4: 완료한 미션의 바로 다음 미션인가?
    if (missionId > 1 && isMissionCompleted(questId, missionId - 1)) {
        return { access: true, reason: 'next_mission' };
    }

    // 규칙 5: 이전 퀘스트를 모두 완료하여 열린 다음 퀘스트의 첫 미션인가?
    if (missionId === 1 && questId > 1 && isQuestFullyCompleted(questId - 1)) {
        return { access: true, reason: 'next_quest' };
    }

    // 위 조건에 해당하지 않으면 접근 불가
    return { access: false, reason: 'locked' };
}

// ==========================================
// 5. 메인 네비게이션 UI 업데이트 (이모지 반영)
// ==========================================
function updateQuestNavigation() {
    const bubbles = document.querySelectorAll('.quest-bubble');
    if (bubbles.length === 0) return; // index.html이 아니면 실행 안 함

    // 퀘스트 이름 배열 (인덱스를 맞추기 위해 0번은 비워둠)
    const questTitles = ["", "영양소", "소화", "순환", "호흡", "배설", "종합"];

    bubbles.forEach((bubble, index) => {
        const questId = index + 1;
        
        // 기존 클래스 및 스타일 초기화
        bubble.classList.remove('active', 'completed', 'locked');
        bubble.style.pointerEvents = 'auto'; 
        bubble.style.opacity = '1';

        let icon = '';

        if (isQuestFullyCompleted(questId)) {
            // 모든 미션을 완료한 단원
            bubble.classList.add('completed');
            icon = '✅';
        } else {
            // 해당 단원의 첫 번째 미션 접근 가능 여부로 단원 개방 상태 확인
            const accessInfo = canAccessMission(questId, 1);
            
            if (accessInfo.access) {
                // 열려있고 진행 중인 단원
                bubble.classList.add('active');
                icon = '🔓'; 
            } else {
                // 아직 도달하지 못해 잠긴 단원
                bubble.classList.add('locked');
                bubble.style.pointerEvents = 'none';
                bubble.style.opacity = '0.6';
                icon = '🔒'; 
            }
        }
        
        // 아이콘과 텍스트를 위아래로 예쁘게 배치 (동그란 버블 모양에 최적화)
        bubble.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; line-height: 1.2;">
                <span style="font-size: 1.4rem; margin-bottom: 3px;">${icon}</span>
                <span style="font-size: 0.95rem;">${questId}. ${questTitles[questId]}</span>
            </div>
        `;
    });
}

// ==========================================
// 6. 퀘스트 화면 진입 및 완료 처리 (규칙 2, 8, 9)
// ==========================================

// 규칙 8: 브라우저 새로고침/진입 시 마지막으로 접근 가능한 미션 번호 반환
window.getLastAvailableMission = function(questId) {
    if (!QUESTS[questId]) return 1;
    const missions = QUESTS[questId].missions;
    let lastAvailable = 1;

    for (let i = 0; i < missions.length; i++) {
        const mId = missions[i].id;
        if (canAccessMission(questId, mId).access) {
            lastAvailable = mId; // 가장 최신 미션으로 갱신
        } else {
            break; // 접근 불가 미션을 만나면 탐색 중지
        }
    }
    return lastAvailable;
};

// 미션 정답을 맞췄을 때 호출하는 글로벌 액션
window.completeMissionAction = function(questId, missionId) {
    // 1. rewards.js의 엔진을 호출하여 최초 1회 보상 권한 체크 및 저장
    if (window.UniversalReward && window.UniversalReward.complete(questId, missionId)) {
        
        // 2. 방금 깬 미션 이후의 진행 상태 점검 (규칙 2 알림 처리)
        if (isQuestFullyCompleted(questId)) {
            const nextQuestAccess = canAccessMission(questId + 1, 1);
            
            if (!nextQuestAccess.access) {
                if (nextQuestAccess.reason === 'teacher_locked_quest') {
                    alert(`🎉 퀘스트 완료! 다음 단원은 아직 선생님이 잠가두셨습니다. 여기까지 완료했습니다.`);
                } else if (nextQuestAccess.reason === 'not_created') {
                    alert(`🏆 모든 퀘스트를 완벽하게 완료했습니다! 대단해요!\n(메인으로 돌아가서 컬렉션을 확인해보세요)`);
                }
            } else {
                alert(`🎉 퀘스트 완료! 새로운 단원의 문이 열렸습니다.`);
            }
        }
        return true; 
    }
    return false; // 이미 완료된 미션을 다시 깬 경우
};

// 초기화 (규칙 9)
window.resetAllProgress = function() {
    // 교사 설정(TEACHER_ACCESS)은 코드에 고정되어 있으므로 건드리지 않고 유저 진행도만 초기화
    saveProgress({ completedMissions: [], rewards: [] });
    if (window.UniversalReward) window.UniversalReward.render();
    
    // 만약 현재 퀘스트 화면이라면 1단원 첫 화면으로 돌려보냄
    if(location.pathname.includes('quest')) {
        location.href = 'index.html';
    } else {
        updateQuestNavigation();
    }
};

// 화면 로드 시 네비게이션 적용
document.addEventListener('DOMContentLoaded', updateQuestNavigation);
