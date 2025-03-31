// Create placeholder images for the Loyalty UI project
document.addEventListener('DOMContentLoaded', function() {
  // Generate placeholder screenshots for the Loyalty UI project
  const createPlaceholderImage = (canvas, title, subtitle, color) => {
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Header bar
    ctx.fillStyle = '#0052cc';
    ctx.fillRect(0, 0, canvas.width, 60);
    
    // Logo text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Poppins, sans-serif';
    ctx.fillText('PremiumRewards', 20, 40);
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Poppins, sans-serif';
    ctx.fillText(title, 40, 120);
    
    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Poppins, sans-serif';
    ctx.fillText(subtitle, 40, 150);
    
    // Create some UI elements
    drawUIElements(ctx, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png');
  };
  
  const drawUIElements = (ctx, width, height) => {
    // Draw some card-like elements
    for (let i = 0; i < 3; i++) {
      // Card background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, 180 + (i * 100), width - 80, 80);
      
      // Card content
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px Poppins, sans-serif';
      ctx.fillText(`Reward Option ${i+1}`, 60, 210 + (i * 100));
      
      ctx.fillStyle = '#666666';
      ctx.font = '14px Poppins, sans-serif';
      ctx.fillText('25,000 points', width - 150, 210 + (i * 100));
      
      // Button
      ctx.fillStyle = '#FF5630';
      ctx.fillRect(width - 120, 230 + (i * 100), 80, 24);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Poppins, sans-serif';
      ctx.fillText('Redeem', width - 100, 246 + (i * 100));
    }
    
    // Navigation elements
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, height - 50, width, 50);
    
    // Nav items
    const navItems = ['Home', 'Points', 'Redeem', 'History'];
    for (let i = 0; i < navItems.length; i++) {
      ctx.fillStyle = i === 2 ? '#0052cc' : '#666666';
      ctx.font = '14px Poppins, sans-serif';
      ctx.fillText(navItems[i], (width / 4) * i + (width / 8) - 15, height - 25);
    }
  };
  
  // Create canvas elements
  const createPlaceholderCanvas = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };
  
  // Generate and save the placeholder images
  const savePlaceholderImages = () => {
    const pages = [
      { title: 'Redemption Catalog', subtitle: 'Choose from exclusive rewards', color: '#2c3e50' },
      { title: 'Points History', subtitle: 'Track your earnings', color: '#3498db' },
      { title: 'Redemption History', subtitle: 'View your past rewards', color: '#e74c3c' }
    ];
    
    // Create a placeholder image for each page
    pages.forEach((page, index) => {
      const canvas = createPlaceholderCanvas(800, 500);
      const imageData = createPlaceholderImage(canvas, page.title, page.subtitle, page.color);
      
      // Create an image element to display the placeholder
      const img = document.createElement('img');
      img.src = imageData;
      img.alt = `${page.title} Screenshot`;
      img.className = 'placeholder-image';
      
      // Add the image to the document
      document.body.appendChild(img);
      
      // For the first image, also use it as the main project image
      if (index === 0) {
        const projectImage = document.querySelector('.portfolio-item img[alt="Credit Card Rewards Program UI Screenshot"]');
        if (projectImage) {
          projectImage.src = imageData;
        }
      }
    });
  };
  
  // Call the function to generate placeholder images
  savePlaceholderImages();
});
