import { useEffect, useState } from "react";
import { DoorOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Configures how many treatment rooms (1-10) can be booked at the same time. */
const TreatmentRoomsSetting = ({ onChange }: { onChange?: (rooms: number) => void }) => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState("1");

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "treatment_rooms").maybeSingle()
      .then(({ data }) => {
        const n = Math.min(10, Math.max(1, parseInt(data?.value ?? "1") || 1));
        setRooms(String(n));
        onChange?.(n);
      });
  }, []);

  const save = async (value: string) => {
    const prev = rooms;
    setRooms(value);
    onChange?.(parseInt(value));
    const { error } = await supabase.from("site_settings").upsert({ key: "treatment_rooms", value }, { onConflict: "key" });
    if (error) {
      setRooms(prev);
      onChange?.(parseInt(prev));
      toast({ title: "Erro ao salvar salas", description: error.message, variant: "destructive" });
    } else {
      onChange?.(parseInt(value));
      toast({ title: value === "1" ? "1 sala: um agendamento por horário" : `${value} salas: até ${value} agendamentos por horário` });
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <DoorOpen className="w-4 h-4 text-muted-foreground" />
      <Select value={rooms} onValueChange={save}>
        <SelectTrigger className="h-9 w-[110px] text-xs" aria-label="Salas de atendimento">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="z-[9999]">
          {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
            <SelectItem key={n} value={n}>{n} {n === "1" ? "sala" : "salas"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TreatmentRoomsSetting;
