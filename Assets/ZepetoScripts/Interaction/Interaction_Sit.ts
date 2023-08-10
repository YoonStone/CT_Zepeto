import { AnimationClip, Canvas, CharacterController, Collider, Debug, GameObject, Transform, WaitForSeconds } from 'UnityEngine'
import { Button } from 'UnityEngine.UI';
import { ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import ClientStarter from '../ClientStarter';

export default class Interaction_Sit extends ZepetoScriptBehaviour {

    public animationClip: AnimationClip;

    openUI: GameObject;
    sittingPos: Transform;
    button: Button;
    canvas: Canvas;
    public number: int;

    isSit: boolean;

    clientStater: ClientStarter;

    Start() {

        this.clientStater = GameObject.Find("ClientStarter").GetComponent<ClientStarter>();

        // 변수 할당
        this.openUI = this.transform.GetChild(0).gameObject;
        this.sittingPos = this.transform.GetChild(1);
        this.button = this.openUI.GetComponentInChildren<Button>();
        this.canvas = this.openUI.GetComponent<Canvas>();


        // 의자 인덱스 부여
        this.number = parseInt(this.gameObject.name.split('_')[1]);

        // 앉기 버튼 누르면 앉기
        this.button.onClick.AddListener(() => {

            // 앉은 의자로 상태 변경
            this.isSit = true;

            // 버튼 안 보이게
            this.openUI.SetActive(false);

            // 내 캐릭터
            const character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character;

            // [의자 동기화] 앉은 의자 번호 갱신
            this.clientStater.SendSitting(this.number);

            // 캐릭터 컨트롤러 끄기
            character.GetComponent<CharacterController>().enabled = false;

            // 앉을 위치로 텔레포트
            character.transform.position = this.sittingPos.position;
            character.transform.rotation = this.sittingPos.rotation;

            // 앉는 제스처
            character.SetGesture(this.animationClip);
        });
    }

    // 닿으면 버튼 보이게
    OnTriggerEnter(collier: Collider) {

        // 빈 의자 + 닿은 캐릭터가 내 캐릭터일 때만
        if (!this.isSit && collier.gameObject
            == ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.gameObject)
        {
            // 모든 의자 찾기
            const chairs = GameObject.FindGameObjectsWithTag("CanSit");

            // 모든 버튼을 반복해서 끄기
            for (var i = 0; i < chairs.Length; i++) {
                chairs[i].transform.GetChild(0).gameObject.SetActive(false);
            }

            // 방금 닿은 이 버튼만 보이게
            this.openUI.SetActive(true);
        }
    }

    // 떨어지면 버튼 안 보이게
    OnTriggerExit(collier) {
        this.openUI.SetActive(false);
    }

    Update()
    {
        // 앉아있는 상태에서 움직이면
        if (this.isSit && ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.tryMove)
        {
            // 내 캐릭터
            const character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character;

            // 제스처 중단
            character.CancelGesture();

            // 캐릭터 컨트롤러 켜기
            character.GetComponent<CharacterController>().enabled = true;

            // 빈 의자로 상태 변경
            this.isSit = false;
        }
    }
}