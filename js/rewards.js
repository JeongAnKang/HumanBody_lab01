// ==========================================
// Universal rewards.js - 범용 퀘스트/미션 보상 엔진
// ==========================================
(function () {
  'use strict';

  // ⚙️ 설정 구역 (필요에 따라 수정하세요)
  const CONFIG = {
    MAX_REWARD_SLOTS: 20,       // 유저가 모을 수 있는 최대 보상 칸 수
    REWARD_IMAGE_COUNT: 26,     // 준비된 보상 이미지의 총 개수
    REWARD_MODE: 'random',      // 💡 'random'(랜덤 뽑기) 또는 'sequential'(1번부터 순차적) 중 선택
    IMAGE_PREFIX: 'images/reward', 
    IMAGE_EXT: '.png'
  };

  // 데이터 구조 초기화
  function normalizeProgress(p) {
    if (!p || typeof p !== 'object') p = {};
    if (!Array.isArray(p.rewards)) p.rewards = [];
    // 💡 퀘스트-미션 고유 ID를 담는 범용 배열 (예: ["q1_m1", "q1_m2", "q2_m1"])
    if (!Array.isArray(p.completedMissions)) p.completedMissions = [];
    return p;
  }

  // 진행도 불러오기 (외부 함수가 없으면 localStorage 기본 사용)
  function readProgress() {
    if (typeof window.getProgress === 'function') {
      return normalizeProgress(window.getProgress());
    }
    const saved = localStorage.getItem('universal_reward_progress');
    return normalizeProgress(saved ? JSON.parse(saved) : {});
  }

  // 진행도 저장하기
  function writeProgress(p) {
    if (typeof window.saveProgress === 'function') {
      window.saveProgress(p);
    } else {
      localStorage.setItem('universal_reward_progress', JSON.stringify(p));
    }
  }

  // 🎯 미션 완료 처리 (정답을 맞혔을 때 호출)
  function completeMission(questId, missionId) {
    const p = readProgress();
    const uniqueId = `${questId}_${missionId}`; // 예: "quest1_mission3"

    // 이미 성공해서 보상 권한을 받은 적이 있는 미션이라면 무시 (최초 1회만 인정)
    if (p.completedMissions.includes(uniqueId)) {
      return false; 
    }

    p.completedMissions.push(uniqueId);
    writeProgress(p);
    renderRewards();
    return true; // 성공적으로 새로운 보상 권한 획득
  }

  // 현재 사용 가능한(아직 뽑지 않은) 보상 티켓 개수 계산
  function getAvailableCount() {
    const p = readProgress();
    return Math.max(0, p.completedMissions.length - p.rewards.length);
  }

  // 🎁 보상 받기 (버튼 클릭 시 실행)
  function claimReward() {
    const p = readProgress();
    const available = getAvailableCount();

    if (available <= 0) return false;
    if (p.rewards.length >= CONFIG.MAX_REWARD_SLOTS) {
      alert(`🎉 ${CONFIG.MAX_REWARD_SLOTS}개의 보상을 모두 모았습니다! 대단해요!`);
      return false;
    }

    let newRewardId;

    // 💡 [로직 분기] 설정값에 따라 랜덤 또는 순차적으로 보상 지급
    if (CONFIG.REWARD_MODE === 'random') {
      // 랜덤 방식: 1 ~ REWARD_IMAGE_COUNT 사이의 무작위 숫자
      newRewardId = Math.floor(Math.random() * CONFIG.REWARD_IMAGE_COUNT) + 1;
    } else if (CONFIG.REWARD_MODE === 'sequential') {
      // 순차 방식: 현재 모은 보상 개수 다음 번호 지급 (1, 2, 3...)
      newRewardId = (p.rewards.length % CONFIG.REWARD_IMAGE_COUNT) + 1;
    }

    // 두 자리 문자열로 포맷팅 (예: 1 -> "01")
    p.rewards.push(String(newRewardId).padStart(2, '0'));
    writeProgress(p);
    
    if (typeof window.launchConfetti === 'function') window.launchConfetti();
    renderRewards();
    return true;
  }

  // UI 화면 업데이트
  function renderRewards() {
    const p = readProgress();
    const rewardArea = document.getElementById('reward-area');
    const countSpan = document.getElementById('reward-count');
    const btnClaim = document.getElementById('btn-claim-reward');
    
    const available = getAvailableCount();

    if (countSpan) countSpan.innerText = available;

    if (btnClaim) {
      const enabled = available > 0 && p.rewards.length < CONFIG.MAX_REWARD_SLOTS;
      btnClaim.disabled = !enabled;
      btnClaim.style.background = enabled ? '#f57f17' : '#cfd8dc';
      btnClaim.style.color = enabled ? '#fff' : '#78909c';
      btnClaim.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }

    if (!rewardArea) return;
    rewardArea.innerHTML = '';
    
    for (let i = 0; i < CONFIG.MAX_REWARD_SLOTS; i++) {
      const slot = document.createElement('div');
      slot.className = 'reward-slot';
      
      if (i < p.rewards.length) {
        const img = document.createElement('img');
        img.className = 'reward-item';
        img.src = `${CONFIG.IMAGE_PREFIX}${p.rewards[i]}${CONFIG.IMAGE_EXT}`;
        img.alt = `획득 보상 ${i + 1}`;
        img.onerror = function () { this.style.display = 'none'; };
        slot.appendChild(img);
      }
      rewardArea.appendChild(slot);
    }
  }

  function resetRewards() {
    writeProgress(normalizeProgress({}));
    renderRewards();
  }

  // 글로벌 API 노출
  window.UniversalReward = {
    complete: completeMission,
    claim: claimReward,
    render: renderRewards,
    reset: resetRewards,
    getAvailable: getAvailableCount
  };

  // 초기화
  document.addEventListener('DOMContentLoaded', renderRewards);
})();