// 로봇 도입 체크리스트 데이터 (docs/robot_registration_checklist.md 기반)
// 각 stage별 sections → items 구조

export const checklistData = {
  'pre-review': {
    title: 'Pre단계. 초기 미팅 / 도입 검토',
    description: '로봇 도입 전 공급업체와 진행하는 사전 검토 단계입니다. 기본 정보와 QCD(품질·비용·납기) 관점을 평가하고, 태스크 수행 가능성 및 안전성등 기본적인 기능을 사전 검토합니다.',
    promptGuide: `[로봇명]에 대해 아래 "도입 검토" 항목을 인터넷에서 조사하여 각 항목별 100자 내외 한국어로 요약해주세요. 필요시 더 상세하게 작성해도 됩니다.

[기본 정보]
1. 공급업체 일반 현황 (회사 규모, 설립연도, 주요 고객사, 사업 안정성)
2. 수행 및 납품 이력 (유사 업종·환경 납품 사례, 실제 운용 실적)
3. 로봇 모델 기본 정보 (제조사명, 모델명, 라인업, 주요 사양 요약)
4. 도입 비용 (본체 단가, SW 라이선스, 유지보수 비용, TCO)
5. 납기 및 지원 조건 (리드타임, 설치 지원, 보증 기간, A/S 정책)

[하드웨어 성능]
6. 하드웨어 성능 관련 문서 (데이터시트, 사양서 제공 여부)
7. 페이로드 (자세별 최대 적재 중량 kg, 한손/양손 조건)
8. 핸드 파지력 및 정밀도 (최대 파지력 N, 파지 정밀도 mm)
9. 파지 가능한 최소 물체 크기/두께 (mm)
10. 그리퍼 교체 구조 (서드파티 부착 가능 여부)
11. 핸드/핑거팁 촉각 센서 지원 여부 (F/T 센서 사양)
12. 로우 데이터 스트리밍 인터페이스 (센서 raw data 인터페이스 종류)
13. 조인트 레벨 직접 제어 가능 여부 (position/velocity/torque 외부 명령)
14. 액션 스페이스 노출 범위 (joint/delta/EE space 접근 가능 범위)

[시뮬레이션 및 환경 지원]
15. 외부 학습 프레임워크 연동 사례
16. 학습 데이터 수집 방법 (텔레오퍼레이션 장비/방식)
17. VLA 모델 종류 및 범용 VLA 연동 가능 여부
18. 바이매뉴얼 VLA 제어 가능 여부 (양팔 동시 제어)
19. 파인튜닝 최소 데이터 수량 (최소 에피소드 수)
20. 제어 루프 주기 (Control Loop Rate Hz)
21. URDF / 디지털 트윈 생성 도구 제공 여부
22. 외부 학습 환경 연동 가이드
23. 시뮬레이터용 모델 파일 및 액추에이터 파라미터 제공 (stiffness/damping)
24. 합성 데이터 수집 파이프라인

[태스크 정의 및 수행 가능성]
25. 태스크 수행 가능 여부 판단
26. 피킹 정확도 (Pick Accuracy %)
27. 새 환경 적응 시간
28. 동적 장애물 회피 반응 지연 (ms)
29. 비정상 상황 자율 복구 범위
30. 구현 최고 수준 태스크 (가장 복잡한 데모)

[안전]
31. 비상 정지 (E-Stop) API 및 HW 구현 방식
32. 작업자 안전 구역 침범 반응 시간 (ms)
33. 충돌 감지 및 충격력 제한 (ISO 10218-2 기준)
34. 전원 차단 시 팔 낙하 방지 (브레이크/백드라이브)
35. 속도 제한 구역 (Speed Zones) 설정 (ISO/TS 15066)
36. 오작동 자동 감지 및 안전 모드 전환
37. 안전 인증 현황 (ISO 10218, CE, UL 등)

참조: 제조사 공식 문서, 데이터시트, 기술 블로그, 논문, GitHub 등 공개 자료
확인 불가 항목은 "미공개" 또는 "해당 없음"으로 표기.

출력 형식 (각 항목마다):
항목번호 | O 또는 X | 메모 내용 (100자 내외, 필요시 상세하게)`,
    sections: [
      {
        id: 'pre-1',
        title: 'Pre-1. 기본 정보 (Basic Information)',
        description: '공급업체 일반 현황 및 도입 모델의 비용·납기 정보를 확인합니다.',
        items: [
          { id: 'pre-1-1', label: '공급업체 일반 현황', desc: '회사 규모, 설립 연도, 주요 고객사 및 시장 내 위치. 사업 안정성과 장기 지원 가능 여부 판단 기준', provided: '회사 소개서' },
          { id: 'pre-1-2', label: '수행 및 납품 이력', desc: '유사 업종·환경에서의 납품 사례 및 실제 운용 실적', provided: '사례 문서 / 영상' },
          { id: 'pre-1-3', label: '로봇 모델 기본 정보', desc: '제조사명, 모델명, 라인업 구성 및 주요 사양 요약', provided: '제품 카탈로그' },
          { id: 'pre-1-4', label: '도입 비용 (Cost)', desc: '로봇 본체 단가, 소프트웨어 라이선스 비용, 연간 유지보수 비용. 총소유비용(TCO) 산정 기준', provided: '견적서' },
          { id: 'pre-1-5', label: '납기 및 지원 조건 (Delivery)', desc: '납기 리드타임, 설치 지원 조건, 보증 기간, A/S 정책', provided: '계약 조건서' },
        ],
      },
      {
        id: 'pre-2',
        title: 'Pre-2. 하드웨어 성능 (Hardware Specifications)',
        items: [
          { id: 'pre-2-1', label: '하드웨어 성능 관련 문서', desc: '데이터 시트/레퍼런스 매뉴얼, 부품단위 제조사, Part Name, 사양서 등', provided: '데이터시트 / 사양서' },
          { id: 'pre-2-2', label: '페이로드 (Payload)', desc: '자세별 최대 적재 중량(kg). 한손/양손 조건별로 확인 필요', provided: '데이터시트' },
          { id: 'pre-2-3', label: '핸드 파지력 및 정밀도', desc: '최대 파지력(N)과 파지 정밀도(mm). 세밀 조작 가능 여부 판단', provided: '데이터시트' },
          { id: 'pre-2-4', label: '파지 가능한 최소 물체 크기/두께', desc: '그리퍼로 집을 수 있는 최소 두께 및 크기(mm)', provided: '데이터시트' },
          { id: 'pre-2-5', label: '그리퍼 교체 구조', desc: '자사 그리퍼만 호환되는지, 서드파티 부착 가능 여부', provided: '호환성 가이드' },
          { id: 'pre-2-6', label: '핸드/핑거팁 촉각 센서 지원 여부', desc: 'Force/Torque 센서 지원 여부 및 사양', provided: '센서 사양서' },
          { id: 'pre-2-7', label: '로우 데이터 스트리밍 인터페이스', desc: '각 센서 raw data를 외부로 내보내는 인터페이스 종류 및 포맷', provided: 'API 문서' },
          { id: 'pre-2-8', label: '조인트 레벨 직접 제어 가능 여부', desc: 'position/velocity/torque 명령을 외부에서 직접 보낼 수 있는지. VLA/RFM 직접 제어에 필수', provided: 'SDK 문서' },
          { id: 'pre-2-9', label: '액션 스페이스 노출 범위', desc: 'joint angle / delta / end-effector space 중 외부에서 접근 가능한 범위', provided: 'API 레퍼런스' },
        ],
      },
      {
        id: 'pre-3',
        title: 'Pre-3. 시뮬레이션 및 환경 지원 (Simulation Ecosystem)',
        items: [
          { id: 'pre-3-1', label: '외부 학습 프레임워크 연동 사례', desc: '주요 오픈소스 로봇 학습 프레임워크와의 공식 연동 사례', provided: '연동 사례 문서' },
          { id: 'pre-3-2', label: '학습 데이터 수집 방법', desc: '텔레오퍼레이션 등, 실로봇 데모 데이터 수집에 필요한 장비나 방식', provided: '텔레오퍼레이션 매뉴얼' },
          { id: 'pre-3-3', label: 'VLA 모델 종류 및 범용 VLA 연동 가능 여부', desc: '자체 탑재 VLA 모델명과 외부 VLA 모델 연동 지원 범위', provided: '기술 백서' },
          { id: 'pre-3-4', label: '바이매뉴얼 VLA 제어 가능 여부', desc: 'VLA로 양팔 동시 동작 제어 가능 여부. Whole Body Control 포함' },
          { id: 'pre-3-5', label: '파인튜닝 최소 데이터 수량', desc: '사전 학습된 policy를 실로봇에 적용 시 필요한 최소 fine-tune 에피소드 수', provided: '학습 가이드' },
          { id: 'pre-3-6', label: '제어 루프 주기 (Control Loop Rate)', desc: 'Control loop rate (Hz). VLA inference 주기와 매칭 필요', provided: '데이터시트' },
          { id: 'pre-3-7', label: 'URDF / 디지털 트윈 생성 도구 제공 여부', desc: 'PoC 환경에 맞는 URDF 또는 디지털 트윈을 생성하는 공식 도구 제공 여부', provided: 'URDF 파일 / 도구' },
          { id: 'pre-3-8', label: '외부 학습 환경 연동 가이드', desc: '자사 시뮬레이터 에셋/시나리오를 외부 학습 프레임워크로 가져와 커스텀 학습 가능 여부', provided: '연동 가이드' },
          { id: 'pre-3-9', label: '시뮬레이터용 모델 파일 및 액추에이터 파라미터 제공', desc: 'stiffness/damping 파라미터가 모델 파일에 통합 제공되는지', provided: 'MJCF / URDF 모델 파일' },
          { id: 'pre-3-10', label: '합성 데이터 수집 파이프라인', desc: '시뮬레이터에서 합성 데이터를 생성하는 방법 및 가이드', provided: '파이프라인 가이드' },
        ],
      },
      {
        id: 'pre-4',
        title: 'Pre-4. 태스크 정의 및 수행 가능성 검토 (Task Definition & Feasibility)',
        description: '수행할 태스크를 먼저 명확히 정의한 후, 해당 로봇이 이를 실제로 수행할 수 있는지 검토합니다.',
        items: [
          { id: 'pre-4-1', label: '태스크 수행 가능 여부 판단', desc: '태스크 명세서 기반 성공/실패에 대한 논의', provided: '태스크 명세서' },
          { id: 'pre-4-2', label: '피킹 정확도 (Pick Accuracy)', desc: '크기/모양/무게 조건별 pick accuracy(%)', provided: '테스트 리포트' },
          { id: 'pre-4-3', label: '새 환경 적응 시간', desc: '사전 맵 없이 새 환경 레이아웃에 적응하는 데 걸리는 시간' },
          { id: 'pre-4-4', label: '동적 장애물 회피 반응 지연', desc: '이동 물체·작업자 혼재 환경에서 감지 → 회피 완료까지 지연 시간(ms)', provided: '테스트 리포트' },
          { id: 'pre-4-5', label: '비정상 상황 자율 복구 범위', desc: '파지 실패/낙하 등 이상 상황에서 인간 개입 없이 자율 복구되는 시나리오 범위' },
          { id: 'pre-4-6', label: '구현 최고 수준 태스크', desc: '현재까지 구현한 가장 복잡한 태스크 데모', provided: '데모 영상' },
        ],
      },
      {
        id: 'pre-5',
        title: 'Pre-5. 안전 (Safety)',
        items: [
          { id: 'pre-5-1', label: '비상 정지 (E-Stop) API 및 HW 구현 방식', desc: '소프트웨어 E-Stop API와 하드웨어 E-Stop 버튼/핀 구현 방식', provided: '안전 매뉴얼' },
          { id: 'pre-5-2', label: '작업자 안전 구역 침범 반응 시간', desc: '안전 구역 침범 감지 → 완전 정지까지 시간(ms)', provided: '테스트 리포트' },
          { id: 'pre-5-3', label: '충돌 감지 및 충격력 제한', desc: 'ISO 10218-2 기준 충족 여부 포함', provided: '안전 인증서' },
          { id: 'pre-5-4', label: '전원 차단 시 팔 낙하 방지', desc: '중력에 의한 팔 자유 낙하를 막는 브레이크/백드라이브 구조 여부', provided: '안전 매뉴얼' },
          { id: 'pre-5-5', label: '속도 제한 구역 (Speed Zones) 설정', desc: 'ISO/TS 15066 협동 운용 기준 충족 여부', provided: '안전 매뉴얼' },
          { id: 'pre-5-6', label: '오작동 자동 감지 및 안전 모드 전환', desc: '과열·이상 토크·통신 단절 등 이상 상황 자동 감지 로직 여부' },
          { id: 'pre-5-7', label: '안전 인증 (Safety Certification) 현황', desc: 'ISO 10218, CE, UL 등 보유 인증 목록', provided: '인증서 사본' },
        ],
      },
    ],
  },

  'registration': {
    title: '단계 1. 로봇 도입 / 등록 (Robot On-boarding & Registration)',
    description: '제조사로부터 확보한 하드웨어 사양을 기반으로 데이터를 등록합니다. 이 등록 데이터는 이후 모든 캘리브레이션·운용·이력 관리의 기준점(baseline)이 됩니다.',
    promptGuide: `[로봇명]의 하드웨어 등록 정보를 아래 항목별로 인터넷에서 조사하여 각 100자 내외 한국어로 요약해주세요. 필요시 더 상세하게 작성해도 됩니다.

[관절 파라미터]
1. 캘리브레이션 및 자체 동적 검증 방법 (로봇 보정 및 기본 동작 점검 방법)
2. 관절 구성 (자유도 DOF, 관절 목록/이름/순서, 관절 타입 Revolute/Prismatic)
3. 액추에이터 정보 (관절별 모터 모델명, 액추에이터 ID, 엔코더 해상도)
4. 캘리브레이션 및 검증 방법 (물리적 로봇 사용 전 기본 점검 방법)
5. 이동 범위 range_min/range_max (관절의 물리적 최소/최대 이동 범위)
6. 최대 속도 / 최대 토크 (관절별 속도·토크 한계)
7. 강성 / 감쇠 Stiffness/Damping (시뮬레이터 actuator 모델링용)

[비전 시스템]
8. 카메라 구성 (장착 카메라 수, 모델명, 위치, 마운트 방식)
9. 해상도 및 렌즈 초기 파라미터 (이미지 해상도, 초점거리, 주점, 왜곡계수)

[센서 구성]
10. 힘/토크 센서 (모델명, 측정 범위 N/Nm, 통신 방식)
11. 관성 측정 장치 IMU (모델명, 장착 위치/방향)
12. 기타 센서 (촉각, 근접, 깊이 등 추가 센서)

[소프트웨어 / 통신]
13. SDK / API (활용 가능한 SDK 제공 여부)
14. 통신 프로토콜 및 미들웨어 지원 (ROS2 등 미들웨어 패키지 제공 여부)
15. 지원 OS (권장 운영체제 목록)

참조: 제조사 공식 문서, 데이터시트, GitHub, SDK 문서 등 공개 자료
확인 불가 항목은 "미공개" 또는 "해당 없음"으로 표기.

출력 형식 (각 항목마다):
항목번호 | O 또는 X | 메모 내용 (100자 내외, 필요시 상세하게)`,
    sections: [
      {
        id: 'reg-1',
        title: '1-1. 관절 파라미터 (Joint Parameters)',
        description: 'CalZero가 캘리브레이션 구조를 생성하는 핵심 데이터입니다.',
        items: [
          { id: 'reg-1-1', label: '캘리브레이션 및 자체 동적 검증 방법', desc: '로봇 사용 전 자체 보정 및 기본 동작 점검 방법', provided: '캘리브레이션 매뉴얼' },
          { id: 'reg-1-2', label: '관절 구성 (Joint Configuration)', desc: '자유도(DOF), 관절 목록/이름/순서, 관절 타입(Revolute/Prismatic)', provided: 'URDF / 사양서' },
          { id: 'reg-1-3', label: '액추에이터 정보 (Actuator Info)', desc: '관절별 모터 모델명, 액추에이터 ID, 엔코더 해상도', provided: '모터 사양서' },
          { id: 'reg-1-4', label: '캘리브레이션 및 검증 방법', desc: '물리적 로봇 사용 전 기본 점검 방법', provided: '캘리브레이션 매뉴얼' },
          { id: 'reg-1-5', label: '이동 범위 (range_min / range_max)', desc: '관절의 물리적 최소/최대 이동 범위. 소프트 리밋 설정 기준', provided: '데이터시트' },
          { id: 'reg-1-6', label: '최대 속도 / 최대 토크', desc: '관절별 속도 및 토크 한계. 과속/과부하 보호 설정 기준', provided: '데이터시트' },
          { id: 'reg-1-7', label: '강성 / 감쇠 (Stiffness / Damping)', desc: '시뮬레이터 actuator 모델링에 필수. URDF에는 포함되지 않음', provided: '시뮬레이터 파라미터 문서' },
        ],
      },
      {
        id: 'reg-2',
        title: '1-2. 비전 시스템 (Vision System)',
        items: [
          { id: 'reg-2-1', label: '카메라 구성 (Camera Configuration)', desc: '장착 카메라 수, 모델명, 위치(head/wrist/stereo), 마운트 방식', provided: '카메라 사양서' },
          { id: 'reg-2-2', label: '해상도 및 렌즈 초기 파라미터', desc: '이미지 해상도, 초점거리(fx/fy), 주점(cx/cy), 왜곡 계수 초기값', provided: '카메라 데이터시트' },
        ],
      },
      {
        id: 'reg-3',
        title: '1-3. 센서 구성 (Sensor Configuration)',
        items: [
          { id: 'reg-3-1', label: '힘/토크 센서 (Force/Torque Sensor)', desc: '모델명, 측정 범위(N/Nm), 통신 방식', provided: '센서 데이터시트' },
          { id: 'reg-3-2', label: '관성 측정 장치 (IMU)', desc: '모델명, 장착 위치 및 방향(xyz + rpy)', provided: 'IMU 데이터시트' },
          { id: 'reg-3-3', label: '기타 센서 (Other Sensors)', desc: '촉각, 근접, 깊이 등 추가 센서 종류 및 모델', provided: '센서 데이터시트' },
        ],
      },
      {
        id: 'reg-4',
        title: '1-4. 소프트웨어 / 통신 (Software / Communication)',
        items: [
          { id: 'reg-4-1', label: 'SDK / API', desc: '활용 가능한 SDK 제공 여부', provided: 'SDK 문서 / GitHub' },
          { id: 'reg-4-2', label: '통신 프로토콜 및 미들웨어 지원', desc: '표준/독자 프로토콜 종류, ROS2 등 미들웨어 패키지 제공 여부', provided: 'ROS2 패키지 / SDK 문서' },
          { id: 'reg-4-3', label: '지원 OS (Operating System)', desc: '권장 운영체제 목록', provided: '설치 가이드' },
        ],
      },
    ],
  },

  'receiving-test': {
    title: '단계 2. 입고 및 테스트 (Receiving & Initial Testing)',
    description: '로봇이 현장에 도착한 후, 본격적인 운용 전에 수행하는 초기 검증 단계입니다. 통신 연결·관절 상태·안전 기능을 확인하고, CalZero를 통해 개체 고유의 캘리브레이션 값을 실측합니다.',
    promptGuide: `[로봇명]의 입고 후 초기 테스트 항목을 아래 기준으로 인터넷에서 조사하여 각 100자 내외 한국어로 요약해주세요. 필요시 더 상세하게 작성해도 됩니다.

[초기 통신 및 하드웨어 확인]
1. 통신 연결 테스트 (SDK 또는 미들웨어로 로봇과 통신 연결 방법)
2. 관절 상태 수신 확인 (모든 관절 현재 위치값 정상 수신 방법)
3. 소프트 리밋 설정 (range_min/range_max 값 입력 및 제한 확인)
4. 안전 기능 작동 테스트 (E-Stop, 안전 구역 감지 실측)

[캘리브레이션 — CalZero 수행]
5. 액추에이터 캘리브레이션 (홈 포지션 세팅, 관절 물리 이동 범위 측정)
6. 카메라 캘리브레이션 (체커보드 내부 파라미터 실측)
7. 추가 센서 캘리브레이션 (센서별 권장 방법으로 캘리브레이션)
8. 캘리브레이션 이력 검토 (복수 결과 비교/통계)

[학습 데이터 수집 환경 구축]
9. 텔레오퍼레이션 방법 및 장비 확보 (리더-팔로워/HMD/글러브 등)
10. 데이터 수집 파이프라인 구성 (수집 포맷 확인, 학습 프레임워크 연동)

참조: 제조사 공식 문서, SDK 가이드, 캘리브레이션 매뉴얼 등 공개 자료
확인 불가 항목은 "미공개" 또는 "해당 없음"으로 표기.

출력 형식 (각 항목마다):
항목번호 | O 또는 X | 메모 내용 (100자 내외, 필요시 상세하게)`,
    sections: [
      {
        id: 'recv-1',
        title: '2-1. 초기 통신 및 하드웨어 확인',
        items: [
          { id: 'recv-1-1', label: '통신 연결 테스트', desc: 'SDK 또는 미들웨어로 로봇과 통신 연결 확인', provided: '퀵스타트 가이드' },
          { id: 'recv-1-2', label: '관절 상태 수신 확인', desc: '모든 관절의 현재 위치값이 정상 수신되는지 확인', provided: 'SDK 문서' },
          { id: 'recv-1-3', label: '소프트 리밋 설정', desc: 'range_min / range_max 값을 CalZero에 입력하고 제한이 정상 작동하는지 확인', provided: '설정 매뉴얼' },
          { id: 'recv-1-4', label: '안전 기능 작동 테스트', desc: 'E-Stop API 및 HW 버튼 동작 확인, 작업자 안전 구역 감지 반응 시간 실측', provided: '안전 매뉴얼' },
        ],
      },
      {
        id: 'recv-2',
        title: '2-2. 캘리브레이션 — CalZero 수행',
        items: [
          { id: 'recv-2-1', label: '액추에이터 캘리브레이션', desc: '제조사 정의 홈 포지션 자세로 로봇 세팅. 각 관절의 실제 물리 이동 범위 측정', tag: 'CalZero', provided: '캘리브레이션 매뉴얼' },
          { id: 'recv-2-2', label: '카메라 캘리브레이션', desc: '체커보드를 활용한 내부 파라미터 실측 (fx, fy, cx, cy, 왜곡계수)', tag: 'CalZero', provided: '캘리브레이션 매뉴얼' },
          { id: 'recv-2-3', label: '추가 센서 캘리브레이션', desc: '센서별 권장 방법으로 캘리브레이션 수행, 기본 특성값 기록', tag: 'CalZero', provided: '센서 매뉴얼' },
          { id: 'recv-2-4', label: '캘리브레이션 이력 검토', desc: '복수 캘리브레이션 결과를 CalZero 비교/통계 기능으로 검토', tag: 'CalZero' },
        ],
      },
      {
        id: 'recv-3',
        title: '2-3. 학습 데이터 수집 환경 구축',
        items: [
          { id: 'recv-3-1', label: '텔레오퍼레이션 방법 및 장비 확보', desc: '리더-팔로워 / HMD / 모션 글러브 등 지원 방식 및 필요 장비 구비', provided: '텔레오퍼레이션 매뉴얼' },
          { id: 'recv-3-2', label: '데이터 수집 파이프라인 구성', desc: '수집 데이터 포맷 확인 (HDF5 / ROS bag 등) 및 학습 프레임워크 연동 테스트', provided: '데이터 포맷 문서' },
        ],
      },
    ],
  },

  'sim-to-real': {
    title: 'Post단계. Sim-to-Real 검증 (Sim-to-Real Validation)',
    description: '시뮬레이터에서 학습한 AI 정책(Policy)이 실제 로봇에서 의도한 대로 동작하는지를 체계적으로 검증하는 단계입니다. Sim과 Real 사이의 Domain Gap을 계층적으로 측정하고, 도메인 랜덤화 범위와 파인튜닝 전략을 데이터 기반으로 조정합니다.',
    sections: [
      {
        id: 'post-1',
        title: 'Post-1. 시뮬레이터 모델 정합성 (Simulation Model Fidelity)',
        description: '업체 제공 모델 파일이 실제 로봇을 정확히 표현하는지 기본 수치부터 확인합니다.',
        items: [
          { id: 'post-1-1', label: '관절 범위 일치 여부', desc: '모델 파일의 joint limit과 CalZero 실측 range 비교. 오차 ±5% 이내 권장', provided: 'URDF / MJCF 모델 파일' },
          { id: 'post-1-2', label: '링크 길이 / 질량 정확도', desc: '모델 파일의 링크 길이와 질량 값이 실제와 일치하는지. 오차 ±2mm 이내 권장', provided: 'CAD 도면 / 모델 파일' },
          { id: 'post-1-3', label: '홈 포지션 일치 여부', desc: 'Sim에서 모든 관절값 0일 때의 자세가 실로봇 홈 포지션과 동일한지', provided: '캘리브레이션 매뉴얼' },
          { id: 'post-1-4', label: '강성/감쇠 파라미터 유효성', desc: '시뮬레이터에 설정한 actuator stiffness/damping 값이 실제 관절 응답과 유사한지', provided: '시뮬레이터 파라미터 문서' },
          { id: 'post-1-5', label: '충돌 메시 정확도', desc: '시뮬레이터 모델의 collision geometry가 실제 로봇 외형과 일치하는지', provided: 'Collision 메시 파일' },
        ],
      },
      {
        id: 'post-2',
        title: 'Post-2. 운동학/역학 매칭 (Kinematics & Dynamics Matching)',
        description: '같은 명령을 주었을 때 Sim과 Real의 동작이 얼마나 일치하는지 정량 측정합니다.',
        items: [
          { id: 'post-2-1', label: '순운동학 오차', desc: '동일 joint angle 시 Sim과 Real의 end-effector 위치 차이. 위치 오차 ±5mm, 자세 오차 ±2° 이내 권장' },
          { id: 'post-2-2', label: '속도/가속도 응답 일치', desc: '동일 velocity 명령에 대한 관절 속도 프로파일 비교. 최종값 오차 ±10%' },
          { id: 'post-2-3', label: '토크 / 중력 보상 동작', desc: '동일 자세에서 Sim과 Real의 관절 토크 값 비교. 오차 ±15% 이내 권장' },
          { id: 'post-2-4', label: '마찰 / 백래시 특성', desc: '저속 왕복 동작에서 encoder 편차 측정. Domain Randomization 범위 설정에 반영' },
        ],
      },
      {
        id: 'post-3',
        title: 'Post-3. 센서 데이터 매칭 (Sensor Data Validation)',
        description: 'Sim의 가상 센서 출력과 실제 센서 출력이 일치하는지 확인합니다.',
        items: [
          { id: 'post-3-1', label: '카메라 내부 파라미터 일치', desc: 'Sim 렌더 카메라의 fx/fy/cx/cy와 CalZero 실측값 비교. 초점거리 오차 ±5% 이내' },
          { id: 'post-3-2', label: '이미지 도메인 갭', desc: 'Sim 렌더링 이미지와 실제 카메라 이미지의 색상/밝기/텍스처 차이 확인' },
          { id: 'post-3-3', label: '힘/토크 센서 제로 오프셋', desc: '실로봇 F/T 센서의 zero drift 여부 확인' },
          { id: 'post-3-4', label: '관절 엔코더 노이즈 수준', desc: '정지 상태에서 encoder raw 값 100회 측정 후 표준편차 확인' },
        ],
      },
      {
        id: 'post-4',
        title: 'Post-4. 정책 전이 검증 (Sim-to-Real Policy Transfer)',
        description: 'Sim에서 학습한 policy를 실로봇에 배포했을 때의 성능을 측정하고 개선 방향을 결정합니다.',
        items: [
          { id: 'post-4-1', label: '제로샷 전이 성공률', desc: 'fine-tune 없이 Sim-only policy를 실로봇에 배포했을 때 태스크 성공률' },
          { id: 'post-4-2', label: '도메인 랜덤화 설정 적정성', desc: 'Sim 학습 시 사용한 DR 범위가 실제 환경 변동 범위를 커버하는지' },
          { id: 'post-4-3', label: '파인튜닝 후 성능 향상', desc: '실로봇 데모 데이터로 fine-tune 후 성공률 변화' },
          { id: 'post-4-4', label: '데이터 포맷 호환성', desc: 'Sim 합성 데이터와 실로봇 수집 데이터의 포맷이 동일하게 처리되는지', provided: '데이터 포맷 문서' },
          { id: 'post-4-5', label: '이상 동작 자율 복구 확인', desc: 'Sim에서 학습된 recovery policy가 실로봇에서도 동작하는지' },
        ],
      },
    ],
  },
}

// Backend API 유틸리티
// 저장: PUT /api/checklists/{robotType}/{stage}
// 조회: GET /api/checklists/{robotType}/{stage}
// 저장 구조: { itemId: { checked: bool, note: string } }
import api from './api'

export async function loadChecklistState(robotType, stage) {
  if (!robotType) return {}
  try {
    const data = await api.checklists.get(robotType, stage)
    // 이전 형식(boolean) 호환: { id: true } → { id: { checked: true, note: '' } }
    const migrated = {}
    for (const [key, val] of Object.entries(data)) {
      if (typeof val === 'boolean') {
        migrated[key] = { checked: val, note: '' }
      } else {
        migrated[key] = val
      }
    }
    return migrated
  } catch {
    return {}
  }
}

export async function saveChecklistState(robotType, stage, state) {
  if (!robotType) return
  try {
    await api.checklists.save(robotType, stage, state)
  } catch (e) {
    console.error('체크리스트 저장 실패:', e)
  }
}
