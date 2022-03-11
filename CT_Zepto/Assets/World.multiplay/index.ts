import {Sandbox, SandboxOptions, SandboxPlayer} from "ZEPETO.Multiplay";
import {DataStorage} from "ZEPETO.Multiplay.DataStorage";
import {Player, Transform, Vector3} from "ZEPETO.Multiplay.Schema";

export default class extends Sandbox {

    storageMap:Map<string,DataStorage> = new Map<string, DataStorage>();
    
    constructor() {
        super();
    }

    // 룸이 생성됐을 때
    onCreate(options: SandboxOptions) {

        // 상태 변화를 서버에 전송
        this.onMessage("onChangedState", (client, message) => {

            // 상태가 바뀐 플레이어 객체 선언
            const player = this.state.players.get(client.sessionId);

            // 플레이어 스키마에 받아온 상태 정보 저장
            player.state = message.state;
        });

        // [의자 동기화] 앉은 상태 변화를 서버에 전송
        this.onMessage("onChangedSitting", (client, message) => {

            // 상태가 바뀐 플레이어 객체 선언
            const player = this.state.players.get(client.sessionId);

            // 플레이어 스키마에 받아온 앉은 상태 정보 저장
            player.sittingNum = message.sittingNum;

            console.log(`[***] ${client.sessionId}의 앉은 상태 : ${player.sittingNum}`);
        });

        // 트랜스폼 변화를 서버에 전송
        this.onMessage("onChangedTransform", (client, message) => {

            // 트랜스폼이 바뀐 플레이어 객체 선언
            const player = this.state.players.get(client.sessionId);

            // 받아온 메시지를 담기 위한 트랜스폼 객체
            const transform = new Transform();

            // 객체에 메시지 담기
            transform.position = new Vector3();
            transform.position.x = message.position.x;
            transform.position.y = message.position.y;
            transform.position.z = message.position.z;

            transform.rotation = new Vector3();
            transform.rotation.x = message.rotation.x;
            transform.rotation.y = message.rotation.y;
            transform.rotation.z = message.rotation.z;

            // 플레이어 스키마에 트랜스폼 정보 저장
            player.transform = transform;
        });
    }
   
    // 클라이언트가 룸에 입장할 때 (SandboxPlayer : 클라이언트와 관련된 정보)
    // async : await 키워드를 사용하기 위함
    async onJoin(client: SandboxPlayer) {

        // 입장한 클라이언트의 정보 출력
        console.log(`[OnJoin] sessionId : ${client.sessionId}, HashCode : ${client.hashCode}, userId : ${client.userId}`)

        // === 입장한 클라이언트의 정보 관리를 위해 플레이어 스키마 객체 선언 ===
        const player = new Player();
        player.sessionId = client.sessionId;
        if (client.hashCode) {
            player.zepetoHash = client.hashCode;
        }
        if (client.userId) {
            player.zepetoUserId = client.userId;
        }
        player.sittingNum = 0;

        // 데이터 스토리지 객체 선언, 클라이언트의 데이터 스토리지 불러와 저장
        const storage: DataStorage = client.loadDataStorage();

        // 클라이언트의 방문 횟수 저장
        this.storageMap.set(client.sessionId,storage);

        // 클라이언트의 방문 횟수 저장
        let visit_cnt = await storage.get("VisitCount") as number;

        // 만약 값이 없으면 0으로 초기화
        if (visit_cnt == null) visit_cnt = 0;

        // 클라이언트의 방문 횟수 출력
        console.log(`[OnJoin] ${client.sessionId}'s visiting count : ${visit_cnt}`)

        // 클라이언트의 방문 횟수를 갱신해서 스토리지에 저장
        await storage.set("VisitCount", ++visit_cnt);

        // 지금까지 사용한 클라이언트의 정보(스키마) 저장 (sessionId : 고유번호)
        // (set 으로 추가된 정보는 클라이언트에서 players.add_OnAdd 이벤트를 추가하여 확인 가능)
        this.state.players.set(client.sessionId, player);
    }

    onTick(deltaTime: number): void {
        //  서버에서 설정된 타임마다 반복적으로 호출되며 deltaTime 을 이용하여 일정한 interval 이벤트를 관리할 수 있음.
    }

     // 플레이어가 룸을 떠날 때 호출
   async onLeave(client: SandboxPlayer, consented?: boolean) {

        // 룸을 떠난 플레이어를 스테이트에서 제거
        // (delete 된 정보는 클라이언트에서 players.add_OnRemove 이벤트를 추가하여 확인 가능)
        this.state.players.delete(client.sessionId);
    }
}