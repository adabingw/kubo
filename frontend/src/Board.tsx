import { useState } from "react";
import Updates from "./Updates";
import Subscriptions from "./Subscriptions";

function Board() {
    const [ panel, setPanel ] = useState<number>(0);

    const focusedStyling = "text-[#474747] font-medium"

    const panelClick = (i: number) => {
        setPanel(i);
    }

    return (
        <div className="w-full flex justify-center flex-col items-center">
            <div className="form-group cursor-pointer flex justify-center">
                <span onClick={() => panelClick(0)} 
                    className={`${panel==0 ? `${focusedStyling}` : 'text-[#99A3BA]'}`}>updates</span>
                <span onClick={() => panelClick(1)} 
                    className={`${panel==1 ? `${focusedStyling}` : 'text-[#99A3BA]'}`}>subscriptions</span>
            </div>
            <div className="w-full">
                {panel == 0 ? <Updates /> : <Subscriptions />}
            </div>
        </div>
    );
}

export default Board;
