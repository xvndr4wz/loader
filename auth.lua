--[[
    ███╗   ██╗██████╗ ██████╗  █████╗  █████╗ ██╗    ██╗███████╗
    ████╗  ██║██╔══██╗██╔══██╗██╔══██╗██╔══██╗██║    ██║╚══███╔╝
    ██╔██╗ ██║██║  ██║██████╔╝███████║███████║██║ █╗ ██║  ███╔╝ 
    ██║╚██╗██║██║  ██║██╔══██╗██╔══██║██╔══██║██║███╗██║ ███╔╝  
    ██║ ╚████║██████╔╝██║  ██║██║  ██║██║  ██║╚███╔███╔╝███████╗
    ╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚══════╝
    ╔════════════════════════════════════════════════════════════╗
    ║  👤 Developer  : Ndraawz                                  ║
    ║  🔒 Obfuscator : Ndraawz                                  ║
    ║  ⚡ Status     : Protected & Encrypted                    ║
    ║  ⚠️  Warning    : Do Not Steal or Redistribute            ║
    ╚════════════════════════════════════════════════════════════╝
]]
function Ioad(name)
    local baseUrl = "https://ndraawzz-developer.vercel.app/api/"
    local token = "HJDBSBCUJJRFMIK2ARAF2W3ZCMRF2C3BFUNWIHTFC4GGUR3MC4FUKUDMCMHGEBSUAEYV4ILKAYWFIH3DFIZQYSCKMJLBWHCSKIMAMYJFBQPQK6ZSEEFBOWR4GAQFM5ZFLNFB2DZEDQ7VSXYTAENBYQYTKVDQI52VM5IR2ULOIVDB6DCJ"
    
    pcall(function()
        local response = game:HttpGet(baseUrl .. name .. "?auth=" .. token)
        loadstring(response)()
    end)
end
