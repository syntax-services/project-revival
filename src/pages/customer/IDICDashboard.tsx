import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trophy, Calendar, Table, GitCommit, ShieldAlert, Plus, Edit2, CheckCircle2, Tv } from "lucide-react";

interface IDICTeam {
  id: string;
  name: string;
  group_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
}

interface IDICMatch {
  id: string;
  round: 'Group' | 'Quarter' | 'Semi' | 'ThirdPlace' | 'Final';
  group_name: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_score: number | null;
  team_b_score: number | null;
  status: 'scheduled' | 'live' | 'completed';
  match_time: string | null;
  pitch: string | null;
  idic_teams_team_a?: { name: string } | null;
  idic_teams_team_b?: { name: string } | null;
}

export default function IDICDashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.user_type === "admin";
  const navigate = useNavigate();
  const [hideIdic, setHideIdic] = useState(false);

  useEffect(() => {
    const checkIdicHide = async () => {
      try {
        const { data } = await supabase
          .from("system_config")
          .select("value")
          .eq("key", "hide_idic_dashboard")
          .maybeSingle();
        if (data && (data.value === true || data.value === "true")) {
          setHideIdic(true);
          if (profile && profile.user_type !== "admin") {
            toast.error("IDIC Dashboard is currently disabled.");
            navigate("/customer");
          }
        }
      } catch (err) {
        console.warn(err);
      }
    };
    checkIdicHide();
  }, [navigate, profile]);

  const [activeTab, setActiveTab] = useState<'bracket' | 'standings' | 'matches'>('bracket');
  const [teams, setTeams] = useState<IDICTeam[]>([]);
  const [matches, setMatches] = useState<IDICMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin states
  const [isScheduling, setIsScheduling] = useState(false);
  const [round, setRound] = useState<'Group' | 'Quarter' | 'Semi' | 'ThirdPlace' | 'Final'>('Group');
  const [groupName, setGroupName] = useState<string>("A");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [pitch, setPitch] = useState("");

  // Editing state
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScoreA, setEditScoreA] = useState("");
  const [editScoreB, setEditScoreB] = useState("");
  const [editStatus, setEditStatus] = useState<'scheduled' | 'live' | 'completed'>('scheduled');

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("idic_teams")
        .select("*")
        .order("points", { ascending: false })
        .order("goals_for", { ascending: false });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch matches with team joins
      const { data: matchesData, error: matchesError } = await supabase
        .from("idic_matches")
        .select(`
          *,
          idic_teams_team_a:team_a_id (name),
          idic_teams_team_b:team_b_id (name)
        `)
        .order("match_time", { ascending: true });

      if (matchesError) throw matchesError;
      
      // Map join results cleanly
      const formattedMatches = (matchesData || []).map((m: any) => ({
        ...m,
        team_a_name: m.idic_teams_team_a?.name || "TBD",
        team_b_name: m.idic_teams_team_b?.name || "TBD",
      }));
      
      setMatches(formattedMatches);
    } catch (err: any) {
      console.error("Error fetching IDIC tournament data:", err);
      toast.error("Failed to load tournament info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScheduleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamAId || !teamBId) {
      toast.error("Please select both teams");
      return;
    }
    if (teamAId === teamBId) {
      toast.error("A team cannot play against itself");
      return;
    }

    try {
      const { error } = await supabase
        .from("idic_matches")
        .insert({
          round,
          group_name: round === "Group" ? groupName : null,
          team_a_id: teamAId,
          team_b_id: teamBId,
          match_time: matchTime ? new Date(matchTime).toISOString() : null,
          pitch: pitch || null,
          status: "scheduled",
        });

      if (error) throw error;
      toast.success("Match scheduled successfully!");
      setIsScheduling(false);
      fetchData();
      // Reset form
      setTeamAId("");
      setTeamBId("");
      setMatchTime("");
      setPitch("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to schedule match");
    }
  };

  const handleUpdateScore = async (matchId: string) => {
    try {
      const scoreA = editScoreA === "" ? null : parseInt(editScoreA);
      const scoreB = editScoreB === "" ? null : parseInt(editScoreB);

      const { error } = await supabase
        .from("idic_matches")
        .update({
          team_a_score: scoreA,
          team_b_score: scoreB,
          status: editStatus,
        })
        .eq("id", matchId);

      if (error) throw error;
      toast.success("Match updated successfully!");
      setEditingMatchId(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update match score");
    }
  };

  // Group teams by Group Letter
  const getGroupTeams = (letter: string) => {
    return teams.filter(t => t.group_name === letter);
  };

  // Filter matches by round
  const getMatchesByRound = (r: IDICMatch['round']) => {
    return matches.filter(m => m.round === r);
  };

  // Renders a single match node inside the Bracket diagram
  const renderBracketMatch = (match: IDICMatch) => {
    const isEditing = editingMatchId === match.id;
    const teamAName = (match as any).team_a_name || "TBD";
    const teamBName = (match as any).team_b_name || "TBD";

    return (
      <div key={match.id} className="relative bg-card border border-border/40 rounded-[24px] p-4 shadow-sm hover:shadow-md transition-all duration-300 min-w-[240px]">
        {match.status === "live" && (
          <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-red-500 text-[9px] font-black uppercase text-white rounded-full flex items-center gap-1 animate-pulse">
            <Tv className="h-3 w-3" /> Live
          </div>
        )}
        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2.5 flex justify-between">
          <span>{match.round}</span>
          {match.pitch && <span>{match.pitch}</span>}
        </div>
        
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground/90">{teamAName}</span>
            <span className="font-mono font-bold bg-muted/30 px-2 py-0.5 rounded-md">
              {match.team_a_score !== null ? match.team_a_score : "-"}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground/90">{teamBName}</span>
            <span className="font-mono font-bold bg-muted/30 px-2 py-0.5 rounded-md">
              {match.team_b_score !== null ? match.team_b_score : "-"}
            </span>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-3.5 pt-2.5 border-t border-border/10 flex justify-end">
            {isEditing ? (
              <div className="space-y-2 w-full">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[9px] font-black uppercase">Score A</Label>
                    <Input 
                      type="number" 
                      value={editScoreA} 
                      onChange={e => setEditScoreA(e.target.value)} 
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div>
                    <Label className="text-[9px] font-black uppercase">Score B</Label>
                    <Input 
                      type="number" 
                      value={editScoreB} 
                      onChange={e => setEditScoreB(e.target.value)} 
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <Select value={editStatus} onValueChange={(val: any) => setEditStatus(val)}>
                    <SelectTrigger className="h-8 text-[11px] rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => handleUpdateScore(match.id)} className="h-8 text-xs px-2.5 rounded-lg">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingMatchId(null)} className="h-8 text-xs px-2.5 rounded-lg">Cancel</Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setEditingMatchId(match.id);
                  setEditScoreA(match.team_a_score !== null ? match.team_a_score.toString() : "");
                  setEditScoreB(match.team_b_score !== null ? match.team_b_score.toString() : "");
                  setEditStatus(match.status);
                }} 
                className="h-7 text-xs rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Edit2 className="h-3 w-3 mr-1" /> Edit Match
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6 md:p-10 animate-fade-in pb-24 space-y-8">
        {hideIdic && isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-3.5 rounded-2xl text-xs font-bold text-center animate-pulse">
             IDIC Dashboard is currently globally HIDDEN on all standard user accounts.
          </div>
        )}
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
               IDIC Championship
            </h1>
            <p className="text-sm text-muted-foreground">
              Inter-Department Intellectual Championship 5-a-side Tournament
            </p>
          </div>

          {isAdmin && (
            <Button 
              onClick={() => setIsScheduling(!isScheduling)} 
              className="rounded-full shadow-premium"
            >
              <Plus className="h-4 w-4 mr-2" /> Schedule Match
            </Button>
          )}
        </div>

        {/* Admin Schedule Panel */}
        {isAdmin && isScheduling && (
          <Card className="border border-border/40 rounded-[28px] overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold tracking-tight">Schedule New Tournament Match</h2>
              <form onSubmit={handleScheduleMatch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="round">Round</Label>
                  <Select value={round} onValueChange={(val: any) => setRound(val)}>
                    <SelectTrigger id="round" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Group">Group Stage</SelectItem>
                      <SelectItem value="Quarter">Quarterfinals</SelectItem>
                      <SelectItem value="Semi">Semifinals</SelectItem>
                      <SelectItem value="ThirdPlace">Third Place Match</SelectItem>
                      <SelectItem value="Final">Championship Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {round === "Group" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="group">Group</Label>
                    <Select value={groupName} onValueChange={setGroupName}>
                      <SelectTrigger id="group" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Group A</SelectItem>
                        <SelectItem value="B">Group B</SelectItem>
                        <SelectItem value="C">Group C</SelectItem>
                        <SelectItem value="D">Group D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="teamA">Team A</Label>
                  <Select value={teamAId} onValueChange={setTeamAId}>
                    <SelectTrigger id="teamA" className="rounded-xl">
                      <SelectValue placeholder="Select Team A" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} (Grp {t.group_name})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="teamB">Team B</Label>
                  <Select value={teamBId} onValueChange={setTeamBId}>
                    <SelectTrigger id="teamB" className="rounded-xl">
                      <SelectValue placeholder="Select Team B" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name} (Grp {t.group_name})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="time">Match Time</Label>
                  <Input 
                    id="time" 
                    type="datetime-local" 
                    value={matchTime} 
                    onChange={e => setMatchTime(e.target.value)} 
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pitch">Pitch / Court</Label>
                  <Input 
                    id="pitch" 
                    placeholder="e.g. Pitch 1, Main Gymnasium" 
                    value={pitch} 
                    onChange={e => setPitch(e.target.value)} 
                    className="rounded-xl"
                  />
                </div>

                <div className="lg:col-span-3 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsScheduling(false)}>Cancel</Button>
                  <Button type="submit">Schedule</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab Selection */}
        <div className="flex bg-muted/40 p-1 rounded-2xl border border-border/10 max-w-md">
          <button
            onClick={() => setActiveTab('bracket')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'bracket' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCommit className="h-4 w-4" /> Knockout Bracket
          </button>
          <button
            onClick={() => setActiveTab('standings')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'standings' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Table className="h-4 w-4" /> Group Standings
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${
              activeTab === 'matches' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-4 w-4" /> Matches List
          </button>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* BRACKET VIEW */}
            {activeTab === 'bracket' && (
              <div className="space-y-10">
                <div className="bg-card border border-border/30 rounded-[32px] p-6 shadow-sm overflow-x-auto">
                  <div className="min-w-[800px] flex justify-between items-start gap-6 py-10 relative">
                    
                    {/* Quarter Finals */}
                    <div className="space-y-8 flex-1">
                      <h3 className="text-center font-bold text-sm tracking-wider text-muted-foreground uppercase mb-6">Quarterfinals</h3>
                      {getMatchesByRound('Quarter').length > 0 ? (
                        getMatchesByRound('Quarter').map(m => renderBracketMatch(m))
                      ) : (
                        <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-2xl">
                          Quarterfinal matches not seeded
                        </div>
                      )}
                    </div>

                    {/* Semis */}
                    <div className="space-y-16 flex-1 pt-12">
                      <h3 className="text-center font-bold text-sm tracking-wider text-muted-foreground uppercase mb-6">Semifinals</h3>
                      {getMatchesByRound('Semi').length > 0 ? (
                        getMatchesByRound('Semi').map(m => renderBracketMatch(m))
                      ) : (
                        <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-2xl">
                          Semifinal matches not seeded
                        </div>
                      )}
                    </div>

                    {/* Finals & 3rd Place */}
                    <div className="space-y-8 flex-1 pt-6">
                      <div>
                        <h3 className="text-center font-bold text-sm tracking-wider text-amber-500 uppercase mb-4"> Grand Final</h3>
                        {getMatchesByRound('Final').length > 0 ? (
                          getMatchesByRound('Final').map(m => renderBracketMatch(m))
                        ) : (
                          <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-2xl">
                            Final match not seeded
                          </div>
                        )}
                      </div>

                      <div className="mt-8">
                        <h3 className="text-center font-bold text-sm tracking-wider text-muted-foreground uppercase mb-4">Third Place</h3>
                        {getMatchesByRound('ThirdPlace').length > 0 ? (
                          getMatchesByRound('ThirdPlace').map(m => renderBracketMatch(m))
                        ) : (
                          <div className="text-center text-xs text-muted-foreground py-8 border border-dashed rounded-2xl">
                            3rd place match not seeded
                          </div>
                        )}
                      </div>
                    </div>
                    
                  </div>
                </div>
              </div>
            )}

            {/* STANDINGS VIEW */}
            {activeTab === 'standings' && (
              <div className="grid md:grid-cols-2 gap-8">
                {['A', 'B', 'C', 'D'].map((grp) => (
                  <Card key={grp} className="border border-border/30 rounded-[28px] overflow-hidden shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="font-extrabold text-lg text-foreground flex items-center gap-2">
                        Group {grp}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-border/30 text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                              <th className="py-2.5">Team</th>
                              <th className="py-2.5 text-center">P</th>
                              <th className="py-2.5 text-center">W</th>
                              <th className="py-2.5 text-center">D</th>
                              <th className="py-2.5 text-center">L</th>
                              <th className="py-2.5 text-center">GD</th>
                              <th className="py-2.5 text-center">PTS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/10">
                            {getGroupTeams(grp).map((team) => (
                              <tr key={team.id} className="hover:bg-muted/20 transition-colors">
                                <td className="py-3 font-semibold text-foreground/90">{team.name}</td>
                                <td className="py-3 text-center font-mono">{team.played}</td>
                                <td className="py-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{team.won}</td>
                                <td className="py-3 text-center font-mono text-muted-foreground">{team.drawn}</td>
                                <td className="py-3 text-center font-mono text-red-600 dark:text-red-400">{team.lost}</td>
                                <td className="py-3 text-center font-mono font-medium">
                                  {team.goals_for - team.goals_against > 0 ? "+" : ""}
                                  {team.goals_for - team.goals_against}
                                </td>
                                <td className="py-3 text-center font-bold text-foreground text-sm font-mono">{team.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* MATCHES VIEW */}
            {activeTab === 'matches' && (
              <div className="space-y-4">
                {matches.length === 0 ? (
                  <div className="text-center py-20 border border-dashed rounded-[32px] text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No matches scheduled yet.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {matches.map((match) => {
                      const teamAName = (match as any).team_a_name || "TBD";
                      const teamBName = (match as any).team_b_name || "TBD";
                      return (
                        <div key={match.id} className="bg-card border border-border/30 rounded-[24px] p-5 shadow-sm space-y-4 relative overflow-hidden">
                          {match.status === "live" && (
                            <div className="absolute top-4 right-4 px-2 py-0.5 bg-red-500 text-[9px] font-black uppercase text-white rounded-full flex items-center gap-1 animate-pulse">
                              <Tv className="h-3 w-3" /> Live
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-wider">
                            <span>{match.round}</span>
                            {match.group_name && <span>• Group {match.group_name}</span>}
                            {match.pitch && <span>• {match.pitch}</span>}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-3 flex-1">
                              <div className="flex justify-between items-center pr-8">
                                <span className="font-bold text-sm text-foreground/80">{teamAName}</span>
                                <span className="font-mono font-black text-sm">
                                  {match.team_a_score !== null ? match.team_a_score : "-"}
                                </span>
                              </div>
                              <div className="flex justify-between items-center pr-8">
                                <span className="font-bold text-sm text-foreground/80">{teamBName}</span>
                                <span className="font-mono font-black text-sm">
                                  {match.team_b_score !== null ? match.team_b_score : "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-border/10 flex justify-between items-center text-xs text-muted-foreground">
                            <span>
                              {match.match_time ? new Date(match.match_time).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }) : "Time TBD"}
                            </span>
                            <span className={`capitalize font-bold text-[10px] px-2 py-0.5 rounded-full ${
                              match.status === "completed" 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                                : match.status === "live"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-muted text-muted-foreground"
                            }`}>
                              {match.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
