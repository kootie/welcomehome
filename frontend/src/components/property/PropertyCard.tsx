import React, { useState } from 'react';
import { Property, PropertyType, InvestmentType, PropertyStatus } from '../../types/index.ts';
import Card from '../common/Card.tsx';
import Button from '../common/Button.tsx';
import { 
  MapPin, 
  Bed, 
  Bath, 
  Square, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Eye,
  Heart,
  Share2
} from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onView?: (property: Property) => void;
  onInvest?: (property: Property) => void;
  onFavorite?: (property: Property) => void;
  onShare?: (property: Property) => void;
  className?: string;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onView,
  onInvest,
  onFavorite,
  onShare,
  className = '',
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const getPropertyTypeIcon = (type: PropertyType) => {
    switch (type) {
      case PropertyType.RESIDENTIAL:
        return '🏠';
      case PropertyType.COMMERCIAL:
        return '🏢';
      case PropertyType.INDUSTRIAL:
        return '🏭';
      case PropertyType.LAND:
        return '🌍';
      case PropertyType.MIXED_USE:
        return '🏘️';
      default:
        return '🏠';
    }
  };

  const getStatusColor = (status: PropertyStatus) => {
    switch (status) {
      case PropertyStatus.AVAILABLE:
        return 'text-success-600 bg-success-50';
      case PropertyStatus.FUNDING:
        return 'text-warning-600 bg-warning-50';
      case PropertyStatus.FUNDED:
        return 'text-primary-600 bg-primary-50';
      case PropertyStatus.SOLD:
        return 'text-secondary-600 bg-secondary-50';
      case PropertyStatus.OFF_MARKET:
        return 'text-error-600 bg-error-50';
      default:
        return 'text-secondary-600 bg-secondary-50';
    }
  };

  const getInvestmentTypeLabel = (type: InvestmentType) => {
    switch (type) {
      case InvestmentType.FULL_OWNERSHIP:
        return 'Full Ownership';
      case InvestmentType.FRACTIONAL:
        return 'Fractional';
      case InvestmentType.TOKENIZED:
        return 'Tokenized';
      default:
        return 'Unknown';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleFavorite = () => {
    setIsFavorite(!isFavorite);
    onFavorite?.(property);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property.title,
        text: property.description,
        url: window.location.href,
      });
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
    onShare?.(property);
  };

  return (
    <Card 
      className={`group hover:shadow-large transition-all duration-300 ${className}`}
      hoverable
      onClick={() => onView?.(property)}
    >
      {/* Image Gallery */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
        {property.images.length > 0 ? (
          <>
            <img
              src={property.images[imageIndex]}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Image Navigation */}
            {property.images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                {property.images.map((_, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex(index);
                    }}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === imageIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-secondary-100 flex items-center justify-center">
            <div className="text-6xl">{getPropertyTypeIcon(property.propertyType)}</div>
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(property.status)}`}>
            {property.status.replace('_', ' ')}
          </span>
        </div>

        {/* Investment Type Badge */}
        <div className="absolute top-3 right-3 group-hover:opacity-0 transition-opacity">
          <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
            {getInvestmentTypeLabel(property.investmentType)}
          </span>
        </div>

        {/* Action Buttons - Show on hover, replacing the investment type badge */}
        <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleFavorite();
            }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
          >
            <Heart 
              className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-secondary-600'}`} 
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
          >
            <Share2 className="w-4 h-4 text-secondary-600" />
          </button>
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Title and Location */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-secondary-900 mb-1 line-clamp-1">
            {property.title}
          </h3>
          <div className="flex items-center text-sm text-secondary-600">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="line-clamp-1">
              {property.address.city}, {property.address.state}
            </span>
          </div>
        </div>

        {/* Property Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="flex items-center text-sm text-secondary-600">
            <Bed className="w-4 h-4 mr-1" />
            <span>{property.bedrooms}</span>
          </div>
          <div className="flex items-center text-sm text-secondary-600">
            <Bath className="w-4 h-4 mr-1" />
            <span>{property.bathrooms}</span>
          </div>
          <div className="flex items-center text-sm text-secondary-600">
            <Square className="w-4 h-4 mr-1" />
            <span>{property.squareFootage.toLocaleString()}</span>
          </div>
        </div>

        {/* Price and Investment Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-secondary-900">
              {formatPrice(property.price)}
            </span>
            <div className="text-right">
              <div className="text-sm text-secondary-600">Expected ROI</div>
              <div className="text-sm font-semibold text-success-600">
                {formatPercentage(property.expectedROI)}
              </div>
            </div>
          </div>

          {/* Crypto Prices */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-2 bg-secondary-50 rounded">
              <div className="font-medium text-crypto-ethereum">ETH</div>
              <div className="text-secondary-600">{property.priceInCrypto.ethereum.toFixed(4)}</div>
            </div>
            <div className="text-center p-2 bg-secondary-50 rounded">
              <div className="font-medium text-crypto-usdc">USDC</div>
              <div className="text-secondary-600">{property.priceInCrypto.usdc.toFixed(2)}</div>
            </div>
            <div className="text-center p-2 bg-secondary-50 rounded">
              <div className="font-medium text-crypto-usdt">USDT</div>
              <div className="text-secondary-600">{property.priceInCrypto.usdt.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Investment Progress */}
        {property.investmentType === InvestmentType.FRACTIONAL && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-secondary-600">Investment Progress</span>
              <span className="font-medium text-secondary-900">
                {property.totalInvested.toLocaleString()} / {property.price.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-secondary-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(property.totalInvested / property.price) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-secondary-500 mt-1">
              <span>{property.totalInvestors} investors</span>
              <span>{property.availableShares} shares left</span>
            </div>
          </div>
        )}

        {/* Tokenization Details */}
        {property.tokenizationDetails && (
          <div className="mb-4 p-3 bg-primary-50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-primary-700">
                {property.tokenizationDetails.tokenSymbol}
              </span>
              <span className="text-primary-600">
                ${property.tokenizationDetails.pricePerToken}
              </span>
            </div>
            <div className="text-xs text-primary-600 mt-1">
              {property.tokenizationDetails.blockchain} • {property.tokenizationDetails.circulatingSupply} circulating
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onInvest?.(property);
            }}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Invest Now
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(property);
            }}
          >
            <Eye className="w-4 h-4 mr-1" />
            View Details
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-3 pt-3 border-t border-secondary-200">
          <div className="flex items-center justify-between text-xs text-secondary-500">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              <span>Built {property.yearBuilt}</span>
            </div>
            <div className="flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>{formatPercentage(property.expectedRentalYield)} rental yield</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PropertyCard;
