import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {ZepetoWorldMultiplay} from 'ZEPETO.World'
import {Room, RoomData} from 'ZEPETO.Multiplay'
import {Player, State, Vector3} from 'ZEPETO.Multiplay.Schema'
import {CharacterState, SpawnInfo, ZepetoPlayers, ZepetoPlayer, ZepetoCharacter} from 'ZEPETO.Character.Controller'
import * as UnityEngine from "UnityEngine"; // Vector3 사용하기 위함
import Interaction_Sit from './Interaction/Interaction_Sit'
import CharacterManager from './CharacterManager'


export default class ClientStarter extends ZepetoScriptBehaviour {

    public multiplay: ZepetoWorldMultiplay;
    private room: Room;

    public animationClip: UnityEngine.AnimationClip;

    // 접속된 플레이어 관리를 위한 변수
    private currentPlayers: Map<string, Player> = new Map<string, Player>();

    private Start() {

        // 룸이 생성되고, 접속 가능할 때
        this.multiplay.RoomCreated += (room: Room) => {
            this.room = room; // 전달받은 룸 저장
        };

        // 룸에 접속했을 때
        this.multiplay.RoomJoined += (room: Room) => {
            room.OnStateChange += this.OnStateChange;// 함수 등록
        };

        // 정기적으로 플레이어의 위치를 전송하기 위해 코루틴 함수 사용
        this.StartCoroutine(this.SendMessageLoop(0.1));
    }

    // 정기적으로 플레이어의 위치를 전송하는 함수
    private* SendMessageLoop(tick: number) {

        // 계속 반복
        while (true) {

            // tick만큼의 딜레이
            yield new UnityEngine.WaitForSeconds(tick);

            // 룸이 없거나 룸에 연결되지 않은 경우가 없도록
            if (this.room != null && this.room.IsConnected) {

                // 존재하는 로컬 플레이어가 존재하는지 체크
                const hasPlayer = ZepetoPlayers.instance.HasPlayer(this.room.SessionId);

                // 존재한다면
                if (hasPlayer) {

                    // 로컬 플레이어 캐릭터 인스턴스 받아오기
                    const myPlayer = ZepetoPlayers.instance.GetPlayer(this.room.SessionId);

                    // 만약 캐릭터가 움직이고 있다면
                    if (myPlayer.character.CurrentState != CharacterState.Idle)

                        // 트랜스폼 정보 전달
                        this.SendTransform(myPlayer.character.transform);
                }
            }
        }
    }

    // 룸 최초 접속 시 호출, 상태 변경 시 호출
    private OnStateChange(state: State, isFirst: boolean) {

        // 이벤트 리스너는 처음 한 번만 등록
        if (isFirst) {

            // 로컬 플레이어의 인스턴스가 씬에 완전히 로드 되었을 때
            ZepetoPlayers.instance.OnAddedLocalPlayer.AddListener(() => {

                // 로컬 플레이어 인스턴스 저장
                const myPlayer = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer;

                // 상태 변화 이벤트 리스너 등록 (cur, next : 캐릭터 스테이트 타입)
                myPlayer.character.OnChangedState.AddListener((cur, next) => {

                    // 캐릭터 스테이트를 서버로 전송
                    this.SendState(cur);
                });
            });

            // 로컬이 아닌 플레이어를 위한 리스너
            ZepetoPlayers.instance.OnAddedPlayer.AddListener((sessionId: string) => {

                // 로컬인지 아닌지 저장
                const isLocal = this.room.SessionId === sessionId;

                // 로컬이 아니라면
                if (!isLocal) {

                    // 커런트 플레이어에서 세션 아이디에 해당되는 플레이어를 불러오기
                    const player: Player = this.currentPlayers.get(sessionId);

                    // 체인지 이벤트에 상태가 변화된 플레이어를 보내주기
                    player.OnChange += (changeValues) => this.OnUpdatePlayer(sessionId, player);
                }
            });
        }

        // 접속한 플레이어를 관리하기 위한 객체
        let join = new Map<string, Player>();

        // 접속해제한 플레이어를 관리하기 위한 객체
        let leave = new Map<string, Player>(this.currentPlayers);

        // 스키마의 룸 스테이트에 저장된 정보들을 하나씩 조회
        state.players.ForEach((sessionId: string, player: Player) => {

            // 만약 세션아이디를 갖고 있지 않다면 = 지금 입장한 플레이어
            if (!this.currentPlayers.has(sessionId)) {

                // set으로 join에 등록
                join.set(sessionId, player);
            }

            // delete로 leave에서 삭제
            leave.delete(sessionId);
        });

        // 룸에 새로운 플레이어가 입장했을 때 이벤트를 받을 수 있도록
        join.forEach((player: Player, sessionId: string) => this.OnJoinPlayer(sessionId, player));

        // 룸에서 플레이어가 떠났을 때 이벤트를 받을 수 있도록
        leave.forEach((player: Player, sessionId: string) => this.OnLeavePlayer(sessionId, player));
    }

    // 룸에 새로운 플레이어가 입장했을 때
    private OnJoinPlayer(sessionId: string, player: Player) {

        // 룸에 새로운 플레이어가 입장했음을 출력
        console.log(`[OnJoinPlayer] players - sessionId : ${sessionId}`);

        // 룸에 입장한 플레이어를 관리하기 위해 변수에 저장
        this.currentPlayers.set(sessionId, player); // -> 그래서 여기 없다면 새로 입장했다고 인식 가능

        // 플레이어 인스턴스에 초기 트랜스폼 설정을 위한 객체 선언
        const spawnInfo = new SpawnInfo();

        // 플레이어의 초기 트랜스폼 설정
        const position = this.ParseVector3(player.transform.position);
        const rotation = this.ParseVector3(player.transform.rotation);

        // 스폰인포 객체에 저장
        spawnInfo.position = position;
        spawnInfo.rotation = UnityEngine.Quaternion.Euler(rotation);

        // 룸의 세션 아이디와 플레이어의 세션 아이디가 같은지 확인하여 로컬 플레이어인지 저장
        const isLocal = this.room.SessionId === player.sessionId;

        // 플레이어의 인스턴스 생성
        ZepetoPlayers.instance.CreatePlayerWithUserId(sessionId, player.zepetoUserId, spawnInfo, isLocal);
    }

    // 룸에서 플레이어가 떠났을 때
    private OnLeavePlayer(sessionId: string, player: Player) {

        // 룸에서 플레이어가 떠났음을 출력
        console.log(`[OnRemove] players - sessionId : ${sessionId}`);

        // 퇴장한 플레이어는 커런트 플레이어에서 제거
        this.currentPlayers.delete(sessionId);

        // 퇴장한 플레이어의 인스턴스 제거
        ZepetoPlayers.instance.RemovePlayer(sessionId);
    }

    // 다른 플레이어의 트랜스폼과 상태 동기화
    private OnUpdatePlayer(sessionId: string, player: Player) {

        // 포지션 값을 유니티 Vector3 형태로 받아오기
        const position = this.ParseVector3(player.transform.position);

        // 로테이션 값을 유니티 Vector3 형태로 받아오기
        const rotation = this.ParseVector3(player.transform.rotation);

        // 다른 플레이어 저장
        const zepetoPlayer = ZepetoPlayers.instance.GetPlayer(sessionId);

        // 다른 플레이어를 변경된 위치로 이동
        zepetoPlayer.character.MoveToPosition(position);

        //  다른 플레이어가 점프 상태라면
        if (player.state === CharacterState.JumpIdle || player.state === CharacterState.JumpMove) {

            // 다른 플레이어가 점프하도록
            zepetoPlayer.character.Jump();
        }

        // 앉은 상태 관리 함수
        this.OnUpdatePlayerSit(player, zepetoPlayer, position, rotation);
        
    }

    // 앉은 상태 관리 함수
    private OnUpdatePlayerSit(player: Player, zepetoPlayer: ZepetoPlayer, position: UnityEngine.Vector3, rotation: UnityEngine.Vector3) {

        // 다른 플레이어가 제스처 상태 (앉은 상태라면) + 내 눈에는 제스처를 안 하는 걸로 보인다면
        if (player.state === CharacterState.Gesture && zepetoPlayer.character.CurrentState !== CharacterState.Gesture) {

            // 다른 플레이어의 캐릭터 컨트롤러 끄기
            zepetoPlayer.character.GetComponent<UnityEngine.CharacterController>().enabled = false;

            // 다른 플레이어를 앉은 위치로 이동
            zepetoPlayer.character.transform.position = position;
            zepetoPlayer.character.transform.rotation = UnityEngine.Quaternion.Euler(rotation);

            // 다른 플레이어 앉기 제스처
            zepetoPlayer.character.SetGesture(this.animationClip);

            // 앉은 의자 관리
            this.ChairCtrl(player.sittingNum, true, zepetoPlayer.character);
        }

        // 다른 플레이어가 제스처 상태+ 내 눈에는 제스처를 하는 걸로 보인다면
        else if (player.state === CharacterState.Gesture && zepetoPlayer.character.CurrentState == CharacterState.Gesture) {

            // 앉아있을 때 x,y,z 중 하나라도 다르다면 위치 조절
            if (zepetoPlayer.character.transform.position.x != this.ParseVector3(player.transform.position).x
                || zepetoPlayer.character.transform.position.y != this.ParseVector3(player.transform.position).y
                || zepetoPlayer.character.transform.position.z != this.ParseVector3(player.transform.position).z) {

                // 다른 플레이어를 앉은 위치로 갱신
                zepetoPlayer.character.transform.position = this.ParseVector3(player.transform.position);
                zepetoPlayer.character.transform.rotation = UnityEngine.Quaternion.Euler(this.ParseVector3(player.transform.rotation));
            }
        }

        // 다른 플레이어가 제스처를 끝냈다면 + 내 눈에는 제스처를 하는 걸로 보인다면
        else if (player.state != CharacterState.Gesture && zepetoPlayer.character.CurrentState == CharacterState.Gesture) {

            // 일어난 의자 관리
            this.ChairCtrl(player.sittingNum, false, zepetoPlayer.character);

            // 다른 플레이어 제스처 끝내기
            zepetoPlayer.character.CancelGesture();

            // 다른 플레이어의 캐릭터 컨트롤러 켜기
            zepetoPlayer.character.GetComponent<UnityEngine.CharacterController>().enabled = true;
        }
    }

    // 의자 관리
    private ChairCtrl(sittingNum: number, isSit: boolean, character: ZepetoCharacter) {

        // 모든 의자들 찾아서 저장
        const chairs = UnityEngine.GameObject.FindGameObjectsWithTag("CanSit");

        // 의자들 중에
        for (var i = 0; i < chairs.length; i++) {

            // 변경 사항이 생긴 의자라면
            if (chairs[i].GetComponent<Interaction_Sit>().number == sittingNum) {

                // 콜라이더 앉았다면 끄고, 일어났다면 켜기
                chairs[i].GetComponent<UnityEngine.SphereCollider>().enabled = !isSit;

                // 앉았다면 버튼도 끄기
                if (isSit)
                    chairs[i].transform.GetChild(0).gameObject.SetActive(false);
            }
        }
    }

    // 트랜스폼 변화를 서버에 전송
    private SendTransform(transform: UnityEngine.Transform) {

        // 서버에 전송할 데이터 타입으로 객체 선언
        const data = new RoomData();

        // 현재 캐릭터의 위치 저장
        const pos = new RoomData();
        pos.Add("x", transform.localPosition.x);
        pos.Add("y", transform.localPosition.y);
        pos.Add("z", transform.localPosition.z);
        data.Add("position", pos.GetObject());

        // 현재 캐릭터의 각도 저장
        const rot = new RoomData();
        rot.Add("x", transform.localEulerAngles.x);
        rot.Add("y", transform.localEulerAngles.y);
        rot.Add("z", transform.localEulerAngles.z);
        data.Add("rotation", rot.GetObject());

        // 클라이언트 -> 서버 메세지 전달
        this.room.Send("onChangedTransform", data.GetObject());
    }

    // 상태 변화를 서버에 전송
    public SendState(state: CharacterState) {

        // 서버에 전송할 데이터 타입으로 객체 선언
        const data = new RoomData();

        // 현재 캐릭터의 상태 추가
        data.Add("state", state);

        // 클라이언트 -> 서버 메세지 전달
        this.room.Send("onChangedState", data.GetObject());
    }

    // [의자 동기화] 앉은 상태 변화를 서버에 전송
    public SendSitting(sittingNum: number) {

        // 서버에 전송할 데이터 타입으로 객체 선언
        const data = new RoomData();

        // 현재 캐릭터의 앉음 상태 추가
        data.Add("sittingNum", sittingNum);

        // 클라이언트 -> 서버 메세지 전달
        this.room.Send("onChangedSitting", data.GetObject());
    }

    // 스키마 Vector3를 유니티 엔진의 Vector3로 변환하는 함수
    private ParseVector3(vector3: Vector3): UnityEngine.Vector3 {
        return new UnityEngine.Vector3
        (
            vector3.x,
            vector3.y,
            vector3.z
        );
    }
}