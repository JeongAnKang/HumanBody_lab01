// js/main.js 

//------------------------------------
//  진행도에 따라 퀘스트 버블에 색상을 입힘
//------------------------------------

function updateQuestNavigation() {
    // 1. 학생의 진행 데이터를 불러옵니다. (기획서 기준 humanbodyProgress 객체)
    // 실제로는 getProgress() 등의 함수를 사용해 계산합니다.
    const progress = readProgress(); 
    
    // 임시 예시: 1단원(영양소)을 깼고, 현재 2단원(소화)을 해야 하는 상황이라고 가정
    const currentQuestNumber = 2; // 이 값은 progress 데이터를 분석하여 동적으로 도출합니다.

    // 2. 모든 퀘스트 버튼의 상태를 초기화
    const bubbles = document.querySelectorAll('.quest-bubble');
    bubbles.forEach(bubble => {
        bubble.classList.remove('active', 'completed');
    });

    // 3. 퀘스트 상태 업데이트
    bubbles.forEach((bubble, index) => {
        const questNum = index + 1;
        
        if (questNum < currentQuestNumber) {
            // 이미 완료한 퀘스트
            bubble.classList.add('completed'); 
        } else if (questNum === currentQuestNumber) {
            // 지금 해야 할 퀘스트 (코랄 핑크 + 애니메이션)
            bubble.classList.add('active');
        } else {
            // 아직 도달하지 못한 퀘스트 (기본 상태 또는 잠금 처리)
            // bubble.style.pointerEvents = 'none'; // 필요 시 클릭 방지
        }
    });
}

// 화면이 로드되면 퀘스트 네비게이션 상태를 업데이트합니다.
document.addEventListener('DOMContentLoaded', updateQuestNavigation);