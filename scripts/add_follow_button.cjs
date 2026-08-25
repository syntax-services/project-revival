const fs = require('fs');
let content = fs.readFileSync('src/pages/business/BusinessPublicProfile.tsx', 'utf8');

if (!content.includes('import { useAuth } from "@/contexts/AuthContext";')) {
    content = content.replace(
      'import { usePageMeta } from "@/hooks/usePageMeta";',
      'import { usePageMeta } from "@/hooks/usePageMeta";\nimport { useAuth } from "@/contexts/AuthContext";\nimport { toast } from "sonner";'
    );
}

if (!content.includes('const [isFollowing, setIsFollowing]')) {
    content = content.replace(
      'const { id } = useParams();',
      'const { id } = useParams();\n  const { user } = useAuth();\n  const [isFollowing, setIsFollowing] = useState(false);\n  const [isFollowLoading, setIsFollowLoading] = useState(false);\n\n  useEffect(() => {\n    if (user && id) {\n      supabase.from("saved_businesses").select("id").eq("customer_id", user.id).eq("business_id", id).maybeSingle().then(({ data }) => {\n        if (data) setIsFollowing(true);\n      });\n    }\n  }, [user, id]);\n\n  const handleFollow = async () => {\n    if (!user) return toast.error("Please sign in to follow stores.");\n    setIsFollowLoading(true);\n    try {\n      if (isFollowing) {\n        await supabase.from("saved_businesses").delete().eq("customer_id", user.id).eq("business_id", id);\n        setIsFollowing(false);\n        toast.success("Unfollowed store");\n      } else {\n        await supabase.from("saved_businesses").insert({ customer_id: user.id, business_id: id });\n        setIsFollowing(true);\n        toast.success("Following store!");\n      }\n    } catch (err) {\n      toast.error("Failed to update follow status.");\n    } finally {\n      setIsFollowLoading(false);\n    }\n  };'
    );
}

if (!content.includes('onClick={handleFollow}')) {
    content = content.replace(
      '<ShareButton',
      '<Button \n                  variant={isFollowing ? "outline" : "default"} \n                  size="sm" \n                  className="rounded-full shadow-lg"\n                  onClick={handleFollow}\n                  disabled={isFollowLoading}\n                >\n                  {isFollowing ? "Following" : "Follow"}\n                </Button>\n                <ShareButton'
    );
}

fs.writeFileSync('src/pages/business/BusinessPublicProfile.tsx', content);
