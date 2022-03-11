import { Canvas, Debug, GameObject } from 'UnityEngine'
import { ZepetoCamera, ZepetoPlayers } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'


export default class Billboard extends ZepetoScriptBehaviour {

    Start()
    {
        // ���� �����̽� ĵ������ ������ ī�޶� ����ϱ�
        this.GetComponent<Canvas>().worldCamera = GameObject.FindObjectOfType<ZepetoCamera>().camera;
    }

    Update()
    {
        // ī�޶��� ���� ���󰡵���
        this.transform.rotation = GameObject.FindObjectOfType<ZepetoCamera>().transform.GetChild(0).rotation;
    }
}