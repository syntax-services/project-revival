const fs = require('fs');
const path = 'src/components/discover/ProductComments.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add replyTo state
content = content.replace('const [newComment, setNewComment] = useState("");', 'const [newComment, setNewComment] = useState("");\n  const [replyTo, setReplyTo] = useState<string | null>(null);');

// Add parent_id to insert mutation
content = content.replace('verified_purchase: true', 'verified_purchase: true,\n          parent_id: replyTo');

// Reset replyTo on success
content = content.replace('setNewComment("");', 'setNewComment("");\n      setReplyTo(null);');

// Handle tree structure rendering
const oldRender =         ) : (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3 items-start p-3 rounded-2xl bg-card border border-border/20 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-border/30">
                {comment.profile?.avatar_url ? (
                  <img src={getMaskedAssetUrl(comment.profile.avatar_url)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">
                    {comment.profile?.full_name || "Verified Member"}
                  </span>
                  <ShieldCheck className="h-3 w-3 text-primary shrink-0 fill-primary/20" />
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))
        )};

const newRender =         ) : (
          (() => {
            const rootComments = comments.filter((c: any) => !c.parent_id);
            const repliesByParent = comments.reduce((acc: any, c: any) => {
              if (c.parent_id) {
                if (!acc[c.parent_id]) acc[c.parent_id] = [];
                acc[c.parent_id].push(c);
              }
              return acc;
            }, {});

            const renderComment = (comment: any, isReply = false) => (
              <div key={comment.id} className={\lex gap-3 items-start p-3 rounded-2xl bg-card border border-border/20 shadow-xs \\}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-border/30">
                  {comment.profile?.avatar_url ? (
                    <img src={getMaskedAssetUrl(comment.profile.avatar_url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground truncate">
                      {comment.profile?.full_name || "Verified Member"}
                    </span>
                    <ShieldCheck className="h-3 w-3 text-primary shrink-0 fill-primary/20" />
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 mt-1 leading-relaxed">
                    {comment.content}
                  </p>
                  {!isReply && user && (
                    <button 
                      onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                      className="text-[10px] font-bold text-primary mt-1 hover:underline"
                    >
                      {replyTo === comment.id ? 'Cancel Reply' : 'Reply'}
                    </button>
                  )}
                  {repliesByParent[comment.id]?.map((reply: any) => renderComment(reply, true))}
                </div>
              </div>
            );

            return rootComments.map((c: any) => renderComment(c));
          })()
        )};

content = content.replace(oldRender, newRender);

fs.writeFileSync(path, content);
console.log("Updated ProductComments");
