import speakingOne from "./SpeakingOne";
import speaking2and3 from "./Speaking2&3";
import { injectTransferTools } from "../utils";

speakingOne.downstreamAgents = [speaking2and3]
speaking2and3.downstreamAgents = [speakingOne]

const agents = injectTransferTools([speakingOne, speaking2and3]);

export default agents;
