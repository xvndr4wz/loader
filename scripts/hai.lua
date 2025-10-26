function missing(t, f, fallback)
    if type(f) == t then return f end
    return fallback 
end

cloneref = missing("function", cloneref, function(...) return ... end)

local services = setmetatable({}, {
    __index = function(_, name)
        return cloneref(game:GetService(name))
    end
})

local players = services.Players
local runservice = services.RunService
local userinputservice = services.UserInputService
local tweenservice = services.TweenService

local player = players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")
local humanoidrootpart = character:WaitForChild("HumanoidRootPart")

player.CharacterAdded:Connect(function(newcharacter)
    character = newcharacter
    humanoid = character:WaitForChild("Humanoid")
    humanoidrootpart = character:WaitForChild("HumanoidRootPart")
end)

local fade_in_time = 0.19 
local fade_out_time = 0.19
local animation_weight = 1

local settings = {}
local emote_id = 114217186508482

local currenttrack
local lastposition = character.PrimaryPart and character.PrimaryPart.Position or Vector3.new()
local is_emote_toggle_active = false
local is_no_clip_active = false

local function loadtrack(id, speedoverride)
    local animspeed = speedoverride or 1
    
    if currenttrack then 
        currenttrack:Stop(0) 
    end

    local animid
    local ok, result = pcall(function()
        return game:GetObjects("rbxassetid://" .. tostring(id))
    end)

    if ok and result and #result > 0 then
        local anim = result[1]
        if anim:IsA("Animation") then
            animid = anim.AnimationId
        else
            animid = "rbxassetid://" .. tostring(id)
        end
    else
        animid = "rbxassetid://" .. tostring(id)
    end

    local newanim = Instance.new("Animation")
    newanim.AnimationId = animid
    local newtrack = humanoid:LoadAnimation(newanim)
    newtrack.Priority = Enum.AnimationPriority.Action4
    newtrack.Looped = true -- PERBAIKAN DITAMBAHKAN DI SINI

    local weight = animation_weight
    if weight == 0 then
        weight = 0.001
    end

    newtrack:Play(fade_in_time, weight, animspeed)
    
    currenttrack = newtrack

    return newtrack
end

local originalcollisionstates = {}
local function savecollisionstates()
    for _, part in ipairs(character:GetDescendants()) do
        if part:IsA("BasePart") and part ~= humanoidrootpart then
            originalcollisionstates[part] = part.CanCollide
        end
    end
end
local function disablecollisionsexceptrootpart()
    for _, part in ipairs(character:GetDescendants()) do
        if part:IsA("BasePart") and part ~= humanoidrootpart then
            part.CanCollide = false
        end
    end
end
local function restorecollisions()
    for part, cancollide in pairs(originalcollisionstates) do
        if part and part.Parent then
            part.CanCollide = cancollide
        end
    end
    originalcollisionstates = {}
end

local function stopemote()
    if currenttrack then
        currenttrack:Stop(fade_out_time)
        currenttrack = nil
    end
    
    is_emote_toggle_active = false
    is_no_clip_active = false
    
    task.wait(0.1)
    
    restorecollisions()

    local button = screenGui:FindFirstChild("MainFrame"):FindFirstChild("Container"):FindFirstChild("EmoteFrame"):FindFirstChild("ToggleButton")
    if button then
        local tweeninfo = TweenInfo.new(0.2, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
        button.Text = "off"
        tweenservice:Create(button, tweeninfo, {BackgroundColor3 = Color3.fromRGB(200, 0, 0)}):Play()
    end
end

runservice.RenderStepped:Connect(function()
    if character.PrimaryPart then
        if not is_emote_toggle_active and currenttrack and currenttrack.IsPlaying then
            local moved = (character.PrimaryPart.Position - lastposition).Magnitude > 0.1
            local jumped = humanoid and humanoid:GetState() == Enum.HumanoidStateType.Jumping
            
            if moved or jumped then
                currenttrack:Stop(fade_out_time) 
                currenttrack = nil
            end
        end
        lastposition = character.PrimaryPart.Position
    end
end)

runservice.Stepped:Connect(function()
    if character and character.Parent then
        if is_no_clip_active then
            disablecollisionsexceptrootpart()
        end
    end
end)

local screengui = Instance.new("ScreenGui")
screengui.Name = "InvisibleModeGUI"
screengui.ResetOnSpawn = false
screengui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screengui.Parent = services.CoreGui

local gui_width = 150 
local gui_height = 85

local mainFrame = Instance.new("Frame")
mainFrame.Name = "MainFrame"
mainFrame.Size = UDim2.new(0, gui_width, 0, gui_height) 
mainFrame.Position = UDim2.new(0.5, -gui_width/2, 0.5, -gui_height/2)
mainFrame.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
mainFrame.BorderSizePixel = 0
mainFrame.Active = true
mainFrame.Draggable = true
mainFrame.Parent = screengui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 12)
mainCorner.Parent = mainFrame

local header = Instance.new("Frame")
header.Name = "Header"
header.Size = UDim2.new(1, 0, 0, 30)
header.BackgroundColor3 = Color3.fromRGB(45, 45, 60)
header.BorderSizePixel = 0
header.Parent = mainFrame

local headerCorner = Instance.new("UICorner")
headerCorner.CornerRadius = UDim.new(0, 12)
headerCorner.Parent = header

local gradient = Instance.new("UIGradient")
gradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(70, 50, 150)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(50, 35, 100))
}
gradient.Rotation = 45
gradient.Parent = header

local titleLabel = Instance.new("TextLabel")
titleLabel.Name = "TitleLabel"
titleLabel.Size = UDim2.new(1, -10, 1, 0)
titleLabel.Position = UDim2.new(0, 5, 0, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "✨ invisible mode"
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.TextSize = 14
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = header

local container = Instance.new("Frame")
container.Name = "Container"
container.Size = UDim2.new(1, -10, 1, -40)
container.Position = UDim2.new(0, 5, 0, 35)
container.BackgroundTransparency = 1
container.Parent = mainFrame

local function createtoggle(position)
    local toggleFrame = Instance.new("Frame")
    toggleFrame.Name = "EmoteFrame"
    toggleFrame.Size = UDim2.new(1, 0, 0, 35)
    toggleFrame.Position = position
    toggleFrame.BackgroundColor3 = Color3.fromRGB(35, 35, 50)
    toggleFrame.BorderSizePixel = 0
    toggleFrame.Parent = container
    
    local toggleCorner = Instance.new("UICorner")
    toggleCorner.CornerRadius = UDim.new(0, 8)
    toggleCorner.Parent = toggleFrame
    
    local button = Instance.new("TextButton")
    button.Name = "ToggleButton"
    button.Size = UDim2.new(1, 0, 1, 0)
    button.Position = UDim2.new(0, 0, 0, 0)
    button.BackgroundColor3 = Color3.fromRGB(200, 0, 0)
    button.BorderSizePixel = 0
    button.Text = "off"
    button.TextColor3 = Color3.fromRGB(255, 255, 255)
    button.TextSize = 14
    button.Font = Enum.Font.GothamBold
    button.Parent = toggleFrame
    
    local buttonCorner = Instance.new("UICorner")
    buttonCorner.CornerRadius = UDim.new(0, 8)
    buttonCorner.Parent = button
    
    button.MouseButton1Click:Connect(function()
        local newstate = button.Text == "off"
        
        local tweeninfo = TweenInfo.new(0.2, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
        
        if newstate then
            button.Text = "on"
            tweenservice:Create(button, tweeninfo, {BackgroundColor3 = Color3.fromRGB(0, 170, 0)}):Play()

            savecollisionstates()
            loadtrack(emote_id, 1)
            is_emote_toggle_active = true
            is_no_clip_active = true
        else
            button.Text = "off"
            tweenservice:Create(button, tweeninfo, {BackgroundColor3 = Color3.fromRGB(200, 0, 0)}):Play()
            
            stopemote()
            is_emote_toggle_active = false
            is_no_clip_active = false
        end
    end)
end

createtoggle(UDim2.new(0, 0, 0, 0))

local dragging = false
local draginput, dragstart, startpos

mainFrame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or 
       input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragstart = input.Position
        startpos = mainFrame.Position
        
        input.Changed:Connect(function()
            if input.UserInputState == Enum.UserInputState.End then
                dragging = false
            end
        end)
    end
end)

mainFrame.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement or 
       input.UserInputType == Enum.UserInputType.Touch then
        draginput = input
    end
end)

userinputservice.InputChanged:Connect(function(input)
    if dragging and input == draginput then
        local delta = input.Position - dragstart
        local newposition = UDim2.new(
            startpos.X.Scale, 
            startpos.X.Offset + delta.X, 
            startpos.Y.Scale, 
            startpos.Y.Offset + delta.Y
        )
        mainFrame.Position = newposition
    end
end)

mainFrame.Position = UDim2.new(0.5, -gui_width/2, -0.5, 0)
local tweeninfo = TweenInfo.new(0.5, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
tweenservice:Create(mainFrame, tweeninfo, {
    Position = UDim2.new(0.5, -gui_width/2, 0.5, -gui_height/2)
}):Play()

savecollisionstates()

player.CharacterAdded:Connect(function(newcharacter)
    character = newcharacter
    humanoid = character:WaitForChild("Humanoid")
    humanoidrootpart = character:WaitForChild("HumanoidRootPart")
    savecollisionstates()
end)
