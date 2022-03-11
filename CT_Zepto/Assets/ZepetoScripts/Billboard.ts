import { Canvas, Debug, GameObject } from 'UnityEngine'
import { ZepetoCamera } from 'ZEPETO.Character.Controller';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'


export default class Billboard extends ZepetoScriptBehaviour {

    Start()
    {
        // 월드 스페이스 캔버스에 제페토 카메라 등록하기
        this.GetComponent<Canvas>().worldCamera = GameObject.FindObjectOfType<ZepetoCamera>().camera;
    }

    Update()
    {
        // 카메라의 각도 따라가도록
        this.transform.rotation = GameObject.FindObjectOfType<ZepetoCamera>().transform.GetChild(0).rotation;
    }
}