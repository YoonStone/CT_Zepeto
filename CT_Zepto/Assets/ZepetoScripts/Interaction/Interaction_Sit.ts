import { AnimationClip, Canvas, CharacterController, Collider, Debug, GameObject, Transform, WaitForSeconds } from 'UnityEngine'
import { EventSystem } from 'UnityEngine.EventSystems';
import { Button } from 'UnityEngine.UI';
import { CharacterState, ZepetoCamera, ZepetoCharacter, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { Room, RoomData } from 'ZEPETO.Multiplay';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { ZepetoWorldMultiplay } from 'ZEPETO.World';
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

        // ���� �Ҵ�
        this.openUI = this.transform.GetChild(0).gameObject;
        this.sittingPos = this.transform.GetChild(1);
        this.button = this.openUI.GetComponentInChildren<Button>();
        this.canvas = this.openUI.GetComponent<Canvas>();


        // ���� �ε��� �ο�
        this.number = parseInt(this.gameObject.name.split('_')[1]);

        // �ɱ� ��ư ������ �ɱ�
        this.button.onClick.AddListener(() => {

            // ���� ���ڷ� ���� ����
            this.isSit = true;

            // ��ư �� ���̰�
            this.openUI.SetActive(false);

            // �� ĳ����
            const character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character;

            // [���� ����ȭ] ���� ���� ��ȣ ����
            this.clientStater.SendSitting(this.number);

            // ĳ���� ��Ʈ�ѷ� ����
            character.GetComponent<CharacterController>().enabled = false;

            // ���� ��ġ�� �ڷ���Ʈ
            character.transform.position = this.sittingPos.position;
            character.transform.rotation = this.sittingPos.rotation;

            // �ɴ� ����ó
            character.SetGesture(this.animationClip);
        });
    }

    // ������ ��ư ���̰�
    OnTriggerEnter(collier: Collider) {

        // �� ���� + ���� ĳ���Ͱ� �� ĳ������ ����
        if (!this.isSit && collier.gameObject
            == ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.gameObject)
        {
            // ��� ���� ã��
            const chairs = GameObject.FindGameObjectsWithTag("CanSit");

            // ��� ��ư�� �ݺ��ؼ� ����
            for (var i = 0; i < chairs.Length; i++) {
                chairs[i].transform.GetChild(0).gameObject.SetActive(false);
            }

            // ��� ���� �� ��ư�� ���̰�
            this.openUI.SetActive(true);
        }
    }

    // �������� ��ư �� ���̰�
    OnTriggerExit(collier) {
        this.openUI.SetActive(false);
    }

    Update()
    {
        // �ɾ��ִ� ���¿��� �����̸�
        if (this.isSit && ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character.tryMove)
        {
            // �� ĳ����
            const character = ZepetoPlayers.instance.LocalPlayer.zepetoPlayer.character;

            // ����ó �ߴ�
            character.CancelGesture();

            // ĳ���� ��Ʈ�ѷ� �ѱ�
            character.GetComponent<CharacterController>().enabled = true;

            // �� ���ڷ� ���� ����
            this.isSit = false;
        }
    }
}