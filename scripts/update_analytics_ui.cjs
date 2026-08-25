const fs = require('fs');
let content = fs.readFileSync('src/pages/business/BusinessAnalytics.tsx', 'utf8');

// Update the topProducts mapping
const targetBlock = '                        <Badge variant="secondary">{product.orders} orders</Badge>';
const replacementBlock =                         <div className="flex gap-2 items-center">
                          <Badge variant="secondary">{product.orders} orders</Badge>
                          <Badge variant="outline" className="text-muted-foreground">
                            {product.impressions} views
                          </Badge>
                          {product.impressions > 0 && (
                            <Badge variant="outline" className="text-primary/70">
                              {((product.clicks / product.impressions) * 100).toFixed(1)}% CTR
                            </Badge>
                          )}
                        </div>;

content = content.replace(targetBlock, replacementBlock);
fs.writeFileSync('src/pages/business/BusinessAnalytics.tsx', content);
