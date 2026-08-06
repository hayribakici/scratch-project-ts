/** Common Scratch opcodes. Other opcode strings can be used directly. */
export const Opcode = {
    GreenFlag: "event_whenflagclicked",
    KeyPressed: "event_whenkeypressed",
    SpriteClicked: "event_whenthisspriteclicked",
    BroadcastReceived: "event_whenbroadcastreceived",
    Broadcast: "event_broadcast",
    BroadcastAndWait: "event_broadcastandwait",
    ProcedureDefinition: "procedures_definition",
    ProcedureCall: "procedures_call",
} as Record<string, string>;
